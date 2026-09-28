module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  // Los .steps.ts son las pruebas BDD (Gherkin + jest-cucumber) de test/bdd.
  testRegex: '.*\\.(spec|steps)\\.ts$',
  // El e2e necesita base de datos: se corre aparte con `npm run test:e2e`.
  testPathIgnorePatterns: ['/node_modules/', '\\.e2e-spec\\.ts$'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // La cobertura se mide sobre el módulo de gestión de productos, que es el
  // alcance del testing de esta entrega. Se excluyen:
  // - specs y steps (son las pruebas, no el código bajo prueba),
  // - módulos y enums (declarativos, sin lógica),
  // - los adaptadores de persistencia (se cubren con pruebas de integración),
  // - producto-operacion y los helpers, que no forman parte del alcance.
  collectCoverageFrom: [
    'src/modules/gestion-productos/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.steps.ts',
    '!**/*.module.ts',
    '!**/enums/**',
    '!**/infraestructure/repositories/**',
    '!**/producto-operacion/**',
    '!**/domain/helpers/**',
  ],
  collectCoverage: false, // Se activa con `npx jest --coverage`.
  coverageDirectory: './coverage',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
