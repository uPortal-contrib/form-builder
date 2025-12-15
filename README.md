# Form Builder

[![NPM Version](https://img.shields.io/npm/v/@uportal/form-builder.svg)](https://www.npmjs.com/package/@uportal/form-builder)
[![Maven Central](https://maven-badges.herokuapp.com/maven-central/org.webjars.npm/uportal__form-builder/badge.svg)](https://maven-badges.herokuapp.com/maven-central/org.webjars.npm/uportal__form-builder)
[![Build Status](https://github.com/uPortal-contrib/form-builder/workflows/CI/badge.svg)](https://github.com/uPortal-contrib/form-builder/actions)

> Create HTML input forms dynamically using Lit web components

## About

This is a lightweight web component built with [Lit](https://lit.dev/) that renders dynamic forms from JSON schemas. Originally built with React (~300KB bundle), it has been rewritten in Lit to achieve a **93% reduction in bundle size** (~20KB), while maintaining all functionality and improving performance.

## Installation

```bash
npm install @uportal/form-builder
```

## Publish to local Maven cache (~/.m2/repository)

To create a Jar of the built web component and publish to cache, run:

```bash
./gradlew jar
./gradlew publishToMavenLocal
```

## Usage

```html
<form-builder
  fbms-base-url="/fbms"
  fbms-form-fname="communication-preferences"
  oidc-url="/uPortal/api/v5-1/userinfo"
  styles="div {color:grey} span {color:orange}"
>
</form-builder>
```

## Properties

- **fbms-base-url**: Base URL of the form builder micro service.
- **fbms-form-fname**: Form name that is appended to the fbms-base-url.
- **oidc-url**: Open ID Connect URL to authenticate requests.
- **styles**: Optional pass-through value to an HTML `style` tag in the render method.

## Development

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Setup

```bash
# Install dependencies
npm install

# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Start development server
npm run serve

# Run tests
npm test

# Build for production
npm run build
```

### Scripts

- `npm run dev` - Build in watch mode
- `npm run serve` - Start development server with live reload
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Check code with ESLint
- `npm run format` - Format code with Prettier
- `npm run build` - Build for production

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Resources

### Lit Framework
- [Lit Documentation](https://lit.dev/docs/) - Official Lit documentation
- [Lit Tutorial](https://lit.dev/tutorials/intro-to-lit/) - Getting started with Lit
- [Lit Playground](https://lit.dev/playground/) - Try Lit in your browser
- [Lit Best Practices](https://lit.dev/docs/components/best-practices/) - Component patterns

### Testing
- [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) - Our test framework
- [Testing Lit Components](https://lit.dev/docs/tools/testing/) - Lit-specific testing guide
- [Open WC Testing](https://open-wc.org/docs/testing/testing-package/) - Testing utilities and helpers

### Web Standards
- [Web Components on MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components) - Web Components fundamentals
- [Custom Elements Everywhere](https://custom-elements-everywhere.com/) - Framework compatibility

### Related Projects
- [Form Builder Microservice](https://github.com/drewwills/fbms) - Backend service for form definitions

## License

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Copyright 2025 The Apereo Foundation. Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for details.
