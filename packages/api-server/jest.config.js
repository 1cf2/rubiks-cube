/** @type {import('jest').Config} */
module.exports = {
  displayName: 'api-server',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/tests/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@rubiks-cube/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^@rubiks-cube/shared$': '<rootDir>/../shared/src'
  }
};