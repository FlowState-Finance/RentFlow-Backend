import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  BASE_FEE,
} from 'stellar-sdk';

export interface PaymentParams {
  fromSecret: string;
  toPublicKey: string;
  amountXlm: string;
  agreementId: string;
}

export interface TxResult {
  hash: string;
  ledger: number;
}

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly server: Horizon.Server;
  private readonly networkPassphrase: string;

  constructor(private readonly config: ConfigService) {
    const horizonUrl = config.get<string>(
      'STELLAR_HORIZON_URL',
      'https://horizon-testnet.stellar.org',
    );
    this.server = new Horizon.Server(horizonUrl);
    this.networkPassphrase =
      config.get<string>('STELLAR_NETWORK') === 'mainnet'
        ? Networks.PUBLIC
        : Networks.TESTNET;
  }

  async submitRentPayment(params: PaymentParams): Promise<TxResult> {
    if (!params.fromSecret) {
      throw new BadRequestException('Signer secret key is required');
    }

    try {
      const sourceKeypair = Keypair.fromSecret(params.fromSecret);
      const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: params.toPublicKey,
            asset: Asset.native(),
            amount: params.amountXlm,
          }),
        )
        .addMemo(Memo.text(`rentflow:${params.agreementId.slice(0, 20)}`))
        .setTimeout(30)
        .build();

      tx.sign(sourceKeypair);
      const result = await this.server.submitTransaction(tx);

      return {
        hash: result.hash,
        ledger: (result as any).ledger ?? 0,
      };
    } catch (err) {
      this.logger.error('Stellar payment failed', err?.response?.data ?? err.message);
      throw new BadRequestException(`Stellar transaction failed: ${err.message}`);
    }
  }

  async getAccountBalance(publicKey: string): Promise<string> {
    const account = await this.server.loadAccount(publicKey);
    const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
    return xlmBalance?.balance ?? '0';
  }

  async getTransaction(hash: string) {
    return this.server.transactions().transaction(hash).call();
  }

  async streamContractEvents(
    contractId: string,
    cursor: string,
    onEvent: (event: any) => void,
  ) {
    // Soroban contract event streaming via Horizon
    return this.server
      .transactions()
      .forAccount(contractId)
      .cursor(cursor)
      .stream({
        onmessage: onEvent,
        onerror: (err) => this.logger.error('Stream error', err),
      });
  }

  getAdminKeypair(): Keypair {
    const secret = this.config.get<string>('STELLAR_ADMIN_SECRET');
    return Keypair.fromSecret(secret);
  }
}
