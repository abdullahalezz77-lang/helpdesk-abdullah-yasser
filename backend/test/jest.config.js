module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@helpdesk/shared$': '<rootDir>/../shared/src',
  },
};
