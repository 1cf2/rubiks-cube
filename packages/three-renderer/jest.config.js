/** @type {import('jest').Config} */
module.exports = {
  displayName: 'three-renderer',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
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
    '^@rubiks-cube/shared$': '<rootDir>/../shared/src',
    '^@rubiks-cube/cube-engine/(.*)$': '<rootDir>/../cube-engine/src/$1',
    '^@rubiks-cube/cube-engine$': '<rootDir>/../cube-engine/src'
  },
  // Mock canvas for Three.js testing
  setupFiles: ['<rootDir>/tests/jest.setup.js']
};