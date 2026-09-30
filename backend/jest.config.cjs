module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          rootDir: '.',
          isolatedModules: true,
        },
      },
    ],
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!main.ts', '!database/prisma/generated/**'],
  coverageDirectory: '../coverage',
};
