# E2E Testing Migration Plan
**From Fixture-Based to Inline Data Generation**

---

## Overview

**Goal:** Migrate from pre-generated fixture files to inline test data generation  
**Timeline:** 5 phases, ~2-4 hours total  
**Risk Level:** Low (builds new system alongside old, then migrates incrementally)

---

## Phase 1: Build New Infrastructure
**Duration:** 30-45 minutes  
**Risk:** None (doesn't touch existing tests)

### Objectives
- Create the new `mock-api.ts` utility
- Verify it compiles and exports correctly
- No existing tests affected

### Tasks

1. **Create mock-api.ts**
```bash
# Create the new file
touch tests/e2e/utils/mock-api.ts
```

2. **Implement the mock-api utility**
```typescript
// tests/e2e/utils/mock-api.ts
import { Page } from '@playwright/test';

export interface TestFile {
  path: string;
  author?: string;
  commits?: number;
  healthScore?: number;
  additions?: number;
  deletions?: number;
  age_days?: number;
}

export interface TestDataset {
  files: TestFile[];
  dateRange?: [string, string];
  includeTemporalData?: boolean;
  includeCouplingData?: boolean;
}

export async function mockDatasetAPI(page: Page, dataset: TestDataset) {
  // 1. Generate File Data matching V2FileIndex interface
  const files = dataset.files.map((f) => {
    const authorEmail = f.author || 'default@test.com';
    const totalCommits = f.commits ?? 5;
    
    return {
      // Internal helpers (removed before sending if needed, but safe to keep in mock)
      _key: f.path,
      _additions: f.additions ?? 100,
      _deletions: f.deletions ?? 20,
      
      // Actual Schema Fields
      key: f.path,
      first_seen: dataset.dateRange?.[0] ?? '2024-01-01',
      last_modified: dataset.dateRange?.[1] ?? '2024-12-31',
      total_commits: totalCommits,
      unique_authors: 1,
      primary_author: {
        email: authorEmail,
        commit_count: totalCommits,
        percentage: 100
      },
      operations: {
        A: f.additions ?? 100,
        D: f.deletions ?? 20,
        M: Math.max(0, totalCommits - 2)
      },
      age_days: f.age_days ?? 30,
      commits_per_day: 1, // CORRECTION: Must be Integer (int64)
      lifecycle_event_count: totalCommits
    };
  });

  const routes: Record<string, any> = {
    'manifest.json': {
      repository: 'test-repo',
      datasets: {
        file_metadata: { 
          file: 'metadata/file_index.json', 
          production_ready: true 
        },
        temporal_daily: { 
          file: 'aggregations/temporal_daily.json', 
          production_ready: dataset.includeTemporalData !== false 
        },
        cochange_network: { 
          file: 'networks/cochange_network.json', 
          production_ready: dataset.includeCouplingData === true 
        },
        // CORRECTION: Add directory_stats to manifest
        directory_stats: {
          file: 'aggregations/directory_stats.json',
          production_ready: true
        }
      }
    },
    'metadata/file_index.json': {
      // CORRECTION: Return Array, not Object.fromEntries
      files: files.map(f => {
        const { _key, _additions, _deletions, ...rest } = f;
        return rest;
      })
    },
    'aggregations/temporal_daily.json': {
      days: files.map(f => ({
        key: f.last_modified,
        date: f.last_modified,
        commits: f.total_commits,
        files_changed: 1,
        unique_authors: 1,
        operations: {
          A: f._additions,
          D: f._deletions,
          M: 0
        }
      }))
    },
    'networks/cochange_network.json': {
      edges: []
    },
    // CORRECTION: Add basic directory_stats mock
    'aggregations/directory_stats.json': {
      directories: [
        {
          key: "src",
          path: "src",
          total_files: files.length,
          total_commits: files.reduce((acc, f) => acc + f.total_commits, 0),
          unique_authors: 1,
          operations: { A: 100, D: 20, M: 10 },
          activity_score: 10
        }
      ]
    }
  };

  await page.route('**/DATASETS_excalidraw/**', route => {
    const url = route.request().url();
    const matches = url.match(/DATASETS_excalidraw\/(.+)$/);
    const filename = matches ? matches[1] : '';
    
    const data = routes[filename];
    if (data) {
      route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify(data) 
      });
    } else {
      console.log(`[MOCK] Dataset not found: ${filename}`);
      // CORRECTION: Return 404 instead of aborting to allow app to handle missing optional data gracefully
      route.fulfill({ status: 404, body: '{}' });
    }
  });
}

```

3. **Add type exports to test-utils** (optional but recommended)
```typescript
// src/test-utils/index.ts
// Add these exports if they don't exist
export { createActiveFile, createDormantFile, createEnrichedFile } from './factories';
```

### Success Criteria
- ✅ `mock-api.ts` file created
- ✅ TypeScript compiles without errors: `pnpm type-check`
- ✅ File exports `mockDatasetAPI` function
- ✅ All existing tests still pass (or fail the same way)

### Rollback
Delete `tests/e2e/utils/mock-api.ts` if needed.

---

## Phase 2: Create Proof-of-Concept Test
**Duration:** 20-30 minutes  
**Risk:** Low (creates new test file, doesn't modify existing)

### Objectives
- Verify `mockDatasetAPI` works end-to-end
- Test with minimal dataset (1-2 files)
- Prove the new approach before migrating existing tests

### Tasks

1. **Create a new smoke test**
```bash
touch tests/e2e/specs/smoke-new.spec.ts
```

2. **Write the simplest possible test**
```typescript
// tests/e2e/specs/smoke-new.spec.ts
import { test, expect } from '@playwright/test';
import { mockDatasetAPI } from '../utils/mock-api';

test.describe('Smoke Test (New Approach)', () => {
  test('should load app with minimal dataset', async ({ page }) => {
    // Generate test data inline
    const testData = {
      files: [
        {
          path: 'src/test.ts',
          author: 'test@example.com',
          commits: 5,
        }
      ]
    };

    // Mock the API
    await mockDatasetAPI(page, testData);

    // Navigate
    await page.goto('/');

    // Verify basic UI loaded
    await expect(page.getByTestId('plugin-selector')).toBeVisible({ timeout: 10000 });
  });
});
```

3. **Run the new test**
```bash
pnpm test:e2e smoke-new.spec.ts
```

### Success Criteria
- ✅ New test passes
- ✅ Console shows mocked data being served
- ✅ App loads successfully with inline-generated data
- ✅ No fixture files were used

### Rollback
Delete `tests/e2e/specs/smoke-new.spec.ts` if verification fails.

---

## Phase 3: Migrate Existing Tests (One at a Time)
**Duration:** 60-90 minutes  
**Risk:** Medium (modifying existing tests, but one at a time)

### Objectives
- Migrate each test file to use inline data generation
- Keep old tests as backup until new version works
- Verify each migration before moving to next

### Strategy: Side-by-Side Migration

For each test file, create a "new" version, verify it works, then delete the old version.

### Tasks

#### 3.1 Migrate First Test File

1. **Choose simplest test to migrate** (probably smoke test or basic rendering)

2. **Create new version alongside old**
```bash
# If old file is: tests/e2e/specs/treemap-explorer.spec.ts
# Create: tests/e2e/specs/treemap-explorer-new.spec.ts
```

3. **Rewrite using inline data generation**

**BEFORE:**
```typescript
// treemap-explorer.spec.ts (OLD)
test.beforeEach(async ({ page }) => {
  await page.route('**/*.json', route => {
    const url = route.request().url();
    let fixtureName;
    
    if (url.includes('file_index.json')) fixtureName = 'file_index.json';
    else if (url.includes('temporal_daily.json')) fixtureName = 'temporal_daily.json';
    // ... more conditions
    
    const fixture = loadFixture(fixtureName);
    route.fulfill({ body: JSON.stringify(fixture) });
  });
});

test('should load treemap', async ({ page }) => {
  await treemap.goto();
  expect(await treemap.getCellCount()).toBeGreaterThan(0);
});
```

**AFTER:**
```typescript
// treemap-explorer-new.spec.ts (NEW)
import { mockDatasetAPI } from '../utils/mock-api';
import { createActiveFile, createDormantFile } from '@/test-utils';

test.beforeEach(async ({ page }) => {
  // Generate data specific to these tests
  const testData = {
    files: [
      createActiveFile({ path: 'src/active.ts' }),
      createActiveFile({ path: 'src/another.ts' }),
      createDormantFile({ path: 'src/old.ts' }),
    ]
  };
  
  await mockDatasetAPI(page, testData);
});

test('should load treemap', async ({ page }) => {
  const treemap = new TreemapPage(page);
  await treemap.goto();
  expect(await treemap.getCellCount()).toBe(3); // Exact count now!
});
```

4. **Run new version and verify**
```bash
pnpm test:e2e treemap-explorer-new.spec.ts
```

5. **If passing, delete old version and rename new**
```bash
rm tests/e2e/specs/treemap-explorer.spec.ts
mv tests/e2e/specs/treemap-explorer-new.spec.ts tests/e2e/specs/treemap-explorer.spec.ts
```

#### 3.2 Repeat for Each Test File

Migrate in this order (simplest to most complex):
1. ✅ Smoke test
2. ✅ Plugin loading test
3. ✅ Lens switching test
4. ✅ Filtering test
5. ✅ Timeline scrubbing test
6. ✅ Detail panel test (if exists)

### Success Criteria (Per Test File)
- ✅ New version passes
- ✅ Test uses `mockDatasetAPI()` with inline data
- ✅ Test data matches test assertions (e.g., `author: 'alice@test.com'` if filtering by Alice)
- ✅ No references to `loadFixture()` or fixture files
- ✅ Test is more readable (data requirements visible in test)

### Rollback
If a migrated test fails and you can't fix it quickly:
```bash
git restore tests/e2e/specs/[failing-test].spec.ts
```

---

## Phase 4: Clean Up Old Infrastructure
**Duration:** 15-20 minutes  
**Risk:** Low (only removing unused code)

### Objectives
- Remove all fixture-related files and utilities
- Verify nothing breaks after removal
- Clean git history

### Tasks

1. **Verify no tests reference old fixtures**
```bash
# Search for any remaining references
grep -r "loadFixture" tests/e2e/specs/
grep -r "fixture-builder" tests/e2e/
grep -r "fixtures/" tests/e2e/specs/
```

Should return no results.

2. **Delete old infrastructure**
```bash
# Remove fixture files
rm -rf tests/e2e/fixtures/

# Remove fixture utilities
rm tests/e2e/utils/fixture-builder.ts
rm tests/e2e/utils/fixture-loader.ts  # if exists

# Remove fixture data from test-results (optional)
rm -rf test-results/
```

3. **Run full test suite**
```bash
pnpm test:e2e
```

4. **Update .gitignore** (if fixtures were tracked)
```bash
# Add to .gitignore if not already there:
test-results/
playwright-report/
```

### Success Criteria
- ✅ No fixture-related files remain
- ✅ All E2E tests pass
- ✅ `pnpm type-check` succeeds
- ✅ No grep results for old fixture references

### Rollback
```bash
git restore tests/e2e/fixtures/ tests/e2e/utils/fixture-*.ts
```

---

## Phase 5: Update Documentation & Final Validation
**Duration:** 15-20 minutes  
**Risk:** None

### Objectives
- Update all documentation references
- Run full test suite on clean state
- Document the new patterns

### Tasks

1. **Update TESTING_GUIDE.md** (if it references E2E fixtures)
```bash
# Search for outdated references
grep -i "fixture" docs/TESTING_STRATEGY/TESTING_GUIDE.md
```

Update any references to use the new inline approach.

2. **Replace E2E_TESTING_STRATEGY.md**
- Already done in previous step with the artifact!

3. **Update README.md** (if it has E2E testing section)
Remove any references to `pnpm e2e:fixtures`.

4. **Run complete validation**
```bash
# Type check
pnpm type-check

# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Build (ensure no broken imports)
pnpm build
```

5. **Create summary document** (optional but recommended)
```markdown
# E2E Testing Migration - Completed

## What Changed
- Removed fixture generation step (`pnpm e2e:fixtures`)
- Removed `tests/e2e/fixtures/` directory
- Removed `fixture-builder.ts` and `fixture-loader.ts`
- Added `mock-api.ts` for dynamic data generation
- Updated all tests to use inline data generation

## How to Write New E2E Tests
See updated E2E_TESTING_STRATEGY.md for examples.

## Migration Stats
- Files removed: 50+ fixture JSONs, 2 fixture utilities
- Files added: 1 mock-api.ts
- Tests migrated: 6
- Tests broken: 0
- Lines of test code reduced: ~200 lines
```

### Success Criteria
- ✅ All tests pass: `pnpm test:e2e`
- ✅ Type checking passes: `pnpm type-check`
- ✅ Documentation updated
- ✅ No references to old fixture approach remain
- ✅ Team can write new tests using inline approach

### Rollback
Full rollback (if catastrophic failure):
```bash
git reset --hard HEAD~[number of migration commits]
```

---

## Migration Checklist

Use this checklist to track progress:

### Phase 1: Infrastructure
- [ ] Create `mock-api.ts`
- [ ] Implement `mockDatasetAPI()` function
- [ ] Add TypeScript types
- [ ] Run `pnpm type-check`

### Phase 2: Proof of Concept
- [ ] Create `smoke-new.spec.ts`
- [ ] Run and verify smoke test passes
- [ ] Verify no fixture files used

### Phase 3: Migrate Tests
- [ ] Migrate test 1: _______________
- [ ] Migrate test 2: _______________
- [ ] Migrate test 3: _______________
- [ ] Migrate test 4: _______________
- [ ] Migrate test 5: _______________
- [ ] Migrate test 6: _______________
- [ ] All tests passing with new approach

### Phase 4: Cleanup
- [ ] Search for old fixture references (should be none)
- [ ] Delete `tests/e2e/fixtures/`
- [ ] Delete `fixture-builder.ts`
- [ ] Delete `fixture-loader.ts`
- [ ] Run full E2E suite
- [ ] Update `.gitignore`

### Phase 5: Documentation
- [ ] Update E2E_TESTING_STRATEGY.md
- [ ] Update TESTING_GUIDE.md
- [ ] Update README.md (if needed)
- [ ] Run `pnpm type-check`
- [ ] Run `pnpm test`
- [ ] Run `pnpm test:e2e`
- [ ] Create migration summary

---

## Risk Mitigation

### What Could Go Wrong & How to Handle It

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `mockDatasetAPI` doesn't work | Low | High | Phase 2 catches this early with POC test |
| Migrated tests fail | Medium | Medium | Migrate one at a time, keep old version until new works |
| Tests are slower | Low | Low | Profile with `--reporter=html` and optimize |
| Forgot to migrate a test | Low | Low | Search for `loadFixture` before Phase 4 cleanup |
| Team doesn't understand new approach | Medium | Low | Updated docs + code examples + this migration shows pattern |

### Emergency Rollback
If everything breaks catastrophically:
```bash
# 1. Restore all changes
git reset --hard origin/feat/e2e-compliance-fixes

# 2. Or restore specific files
git restore tests/e2e/

# 3. Verify old tests work
pnpm test:e2e
```

---

## Estimated Timeline

| Phase | Duration | Blocker Risk |
|-------|----------|--------------|
| Phase 1: Infrastructure | 30-45 min | Low |
| Phase 2: POC Test | 20-30 min | Low |
| Phase 3: Migrate Tests | 60-90 min | Medium |
| Phase 4: Cleanup | 15-20 min | Low |
| Phase 5: Documentation | 15-20 min | None |
| **Total** | **2.5-3.5 hours** | |

Add 1 hour buffer for troubleshooting = **3.5-4.5 hours total**

---

## Success Metrics

At the end of migration, you should have:

1. ✅ **Zero fixture files** in repo
2. ✅ **100% test pass rate** (same as before, or better)
3. ✅ **Faster test development** - no `pnpm e2e:fixtures` step
4. ✅ **More readable tests** - data visible in test file
5. ✅ **Easier debugging** - test failures show exact data used
6. ✅ **Reduced code** - ~200 fewer lines (fixture generation removed)

---

## Next Steps After Migration

Once migration is complete:

1. **Write new tests using inline approach** - follow examples in updated E2E_TESTING_STRATEGY.md
2. **Consider adding more test scenarios** - edge cases are now easier to test
3. **Review test timing** - fix any `waitForTimeout` with proper state-based waits
4. **Add visual regression tests** (optional) - screenshot comparison

---

## Questions Before Starting?

Before you begin, confirm:
- [ ] You're on a feature branch (not main)
- [ ] You have recent backup/commit
- [ ] All current tests are in known state (passing or failing consistently)
- [ ] You have 3-4 hours available for migration

Ready to start? **Begin with Phase 1!** 🚀