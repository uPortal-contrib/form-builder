# Contributing to [Project Name]

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Review Process](#code-review-process)

## Getting Started

This is a Lit-based web component project. We've recently migrated from React to Lit to reduce bundle size and stay closer to web standards.

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- Python 3.7+ (for pre-commit hooks)

## Development Setup

1. **Fork and clone the repository**:

   ```bash
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Install pre-commit hooks**:

   ```bash
   pip install pre-commit
   pre-commit install
   ```

4. **Verify your setup**:
   ```bash
   npm run build
   npm test
   npm run serve
   ```

If the build succeeds, tests pass, and the dev server starts, you're ready to contribute!

## Code Style

We use automated tooling to maintain consistent code style across the project.

### Formatting

- **Prettier** handles all code formatting automatically
- Pre-commit hooks will format your code before each commit
- Configuration is in `.prettierrc.json`

### Key Style Points

- 2-space indentation
- Single quotes for strings
- Semicolons required
- 100 character line length
- ES6+ JavaScript features encouraged

### Manual Formatting

If you need to check or format code manually:

```bash
# Check formatting (doesn't modify files)
npm run lint:check

# Check ESLint rules
npm run lint

# Auto-fix formatting
npm run format
```

## Making Changes

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, readable code
   - Follow existing patterns in the codebase
   - Add tests for new features
   - Update documentation as needed

3. **Commit your changes**:

   ```bash
   git add .
   git commit -m "Brief description of your changes"
   ```

   Pre-commit hooks will automatically:
   - Format your code with Prettier
   - Remove trailing whitespace
   - Fix line endings
   - Check for merge conflicts

4. **Keep your branch updated**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

## Testing

We use Web Test Runner for testing our Lit components.

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode (great for TDD)
npm run test:watch

# Run tests for CI
npm run test:ci
```

### Writing Tests

- Place test files next to the code they test with `.test.js` extension
- Use descriptive test names that explain what is being tested
- Test user interactions, not implementation details
- Aim for high coverage of critical paths

Example test structure:

```javascript
import { fixture, html, expect } from '@open-wc/testing';
import './your-component.js';

describe('YourComponent', () => {
  it('renders with default properties', async () => {
    const el = await fixture(html`<your-component></your-component>`);
    expect(el.shadowRoot.querySelector('.container')).to.exist;
  });

  it('handles user interaction', async () => {
    const el = await fixture(html`<your-component></your-component>`);
    const button = el.shadowRoot.querySelector('button');
    button.click();
    await el.updateComplete;
    // Assert expected behavior
  });
});
```

## Submitting Changes

1. **Push your branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**:
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill out the PR template with:
     - Clear description of changes
     - Link to related issues
     - Screenshots (if UI changes)
     - Testing performed

3. **Wait for CI checks**:
   - GitHub Actions will automatically run tests and checks
   - All checks must pass before merging
   - Fix any issues reported by CI

## Code Review Process

1. **Automated Checks**:
   - Prettier formatting validation
   - Test suite execution
   - Build verification
   - Bundle size check

2. **Human Review**:
   - At least one maintainer will review your PR
   - Respond to feedback constructively
   - Make requested changes in new commits
   - Mark conversations as resolved once addressed

3. **Merging**:
   - PRs are squash-merged to keep history clean
   - Your commits will be combined into one
   - Write a clear commit message summarizing all changes

## Questions or Problems?

- **Found a bug?** Open an issue with steps to reproduce
- **Have a question?** Check existing issues or open a new one
- **Want to propose a feature?** Open an issue for discussion first

## Why These Guidelines?

- **Pre-commit hooks**: Catch issues early, before they reach CI
- **Automated formatting**: Eliminates style debates, keeps diffs clean
- **Testing requirements**: Ensures reliability and prevents regressions
- **Code review**: Maintains quality and shares knowledge

Thank you for contributing! Your efforts help make this project better for everyone.
