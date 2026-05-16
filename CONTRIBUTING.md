# Contributing to RentFlow

Thank you for your interest in contributing to RentFlow! This is an open-source project and we welcome contributions of all kinds — bug fixes, new features, documentation improvements, and tests.

Please read this guide before opening a pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you agree to uphold a respectful and inclusive environment. Harassment, discrimination, or abusive behavior will not be tolerated.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/RentFlow-Backend.git
   cd RentFlow-Backend
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```
5. **Start a local PostgreSQL database** and update `.env` with your credentials
6. **Start the dev server:**
   ```bash
   npm run start:dev
   ```

---

## Development Workflow

```
main          ← stable, production-ready
  └── feat/your-feature    ← your work
  └── fix/bug-description
  └── docs/update-readme
  └── chore/upgrade-deps
```

Always branch off `main`. Never commit directly to `main`.

---

## Branch Naming

Use the following prefixes:

| Prefix | Use for |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `chore/` | Dependency updates, tooling |
| `test/` | Adding or fixing tests |
| `refactor/` | Code restructuring without behavior change |

Examples:
- `feat/soroban-contract-invocation`
- `fix/payment-window-validation`
- `docs/deployment-guide`

---

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format:**
```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no logic change |
| `refactor` | Code change that is neither a fix nor a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates |

**Examples:**
```
feat(payments): add payment window validation
fix(scheduler): prevent duplicate pending payment records
docs(readme): add docker setup instructions
test(agreements): add unit tests for status transitions
```

---

## Code Style

- **Language:** TypeScript (strict mode encouraged)
- **Formatter:** Prettier (run `npx prettier --write src/`)
- **Linter:** ESLint (run `npm run lint`)
- **Naming:** camelCase for variables/functions, PascalCase for classes/types, UPPER_SNAKE_CASE for constants
- **Modules:** Each feature module owns its entity, service, controller, DTOs, and spec file
- **No magic numbers:** Use named constants or config values
- **Error handling:** Throw NestJS `HttpException` subclasses (`BadRequestException`, `NotFoundException`, etc.) — never raw `Error`
- **Logging:** Use NestJS `Logger` — never `console.log` in production code

---

## Testing

All new features and bug fixes must include tests.

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

**Guidelines:**
- Unit tests live alongside the file they test: `agreements.service.spec.ts`
- Mock all external dependencies (TypeORM repos, StellarService, etc.)
- Test both the happy path and error cases
- Aim for >80% coverage on new code

---

## Pull Request Process

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Run tests and linting:
   ```bash
   npm test
   npm run lint
   ```
3. Push your branch and open a PR against `main`
4. Fill in the PR template:
   - **What does this PR do?** — brief summary
   - **How was it tested?** — manual steps or test output
   - **Breaking changes?** — yes/no, and what they are
   - **Related issues** — link any GitHub issues
5. Request a review from a maintainer
6. Address review feedback — push additional commits, do not force-push
7. A maintainer will merge once approved

**PR title format:** same as commit messages — `feat(scope): description`

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/FlowState-Finance/RentFlow-Backend/issues/new) with:

- A clear title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, PostgreSQL version)
- Relevant logs or error messages

---

## Suggesting Features

Open a [GitHub Issue](https://github.com/FlowState-Finance/RentFlow-Backend/issues/new) with the label `enhancement` and describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered
- Whether you'd like to implement it yourself

---

## Questions?

Open a [Discussion](https://github.com/FlowState-Finance/RentFlow-Backend/discussions) or reach out via the project's community channels.

We appreciate every contribution, no matter how small. Thank you for helping build RentFlow!
