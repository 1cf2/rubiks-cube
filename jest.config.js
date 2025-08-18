/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/packages/shared',
    '<rootDir>/packages/cube-engine', 
    '<rootDir>/packages/three-renderer',
    '<rootDir>/packages/web-app',
    '<rootDir>/packages/api-server'
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.stories.{ts,tsx}',
    '!packages/*/src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov', 'json'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};