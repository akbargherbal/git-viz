import { TestFile } from './mock-api';

export function createActiveFile(overrides: Partial<TestFile> = {}): TestFile {
  return {
    path: 'src/active.ts',
    author: 'active@test.com',
    commits: 50,
    additions: 500,
    deletions: 50,
    ...overrides
  };
}

export function createDormantFile(overrides: Partial<TestFile> = {}): TestFile {
  return {
    path: 'src/dormant.ts',
    author: 'dormant@test.com',
    commits: 5,
    additions: 50,
    deletions: 0,
    age_days: 200,
    ...overrides
  };
}
