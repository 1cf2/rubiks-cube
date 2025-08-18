/** @type {import('jest').Config} */
module.exports = {
  displayName: 'web-app',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@rubiks-cube/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^@rubiks-cube/shared$': '<rootDir>/../shared/src',
    '^@rubiks-cube/cube-engine/(.*)$': '<rootDir>/../cube-engine/src/$1',
    '^@rubiks-cube/cube-engine$': '<rootDir>/../cube-engine/src',
    '^@rubiks-cube/three-renderer/(.*)$': '<rootDir>/../three-renderer/src/$1',
    '^@rubiks-cube/three-renderer$': '<rootDir>/../three-renderer/src',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFiles: ['<rootDir>/tests/jest.setup.js']
};