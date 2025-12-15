import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  files: 'test/**/*.test.js',
  nodeResolve: true,

  // Test framework
  testFramework: {
    config: {
      timeout: 500,
    },
  },

  // Browser configuration
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    // Optionally test in other browsers:
    // playwrightLauncher({ product: 'firefox' }),
    // playwrightLauncher({ product: 'webkit' }),
  ],

  // Coverage configuration
  coverage: true,
  coverageConfig: {
    threshold: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
    reportDir: 'coverage',
  },

  // Test isolation
  testRunnerHtml: (testFramework) =>
    `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>`,
};
