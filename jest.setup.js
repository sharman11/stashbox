/* Jest setup: provide the official AsyncStorage mock so modules that import it
 * (e.g. lib/expenses/fx.ts) load cleanly under the test runner. */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
