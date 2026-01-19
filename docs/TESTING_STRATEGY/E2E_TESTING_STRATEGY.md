# E2E Testing Strategy
**Git-Viz Project - End-to-End Testing Guidelines**

This document outlines the principles and key decisions for E2E testing in the git-viz project.

---

## Guiding Principles

### 1. **Debuggability First**
E2E tests must make debugging EASIER, not harder. Every test failure should provide clear evidence of what went wrong.

### 2. **Minimal Coverage, Maximum Value**  
Focus on 5-7 critical user paths, not exhaustive coverage. Unit/integration tests handle the details.

### 3. **Reuse Existing Infrastructure**
Use test-utils factories to generate test data **inline within each test file**. Each test creates its own minimal dataset specific to its scenario.

### 4. **Keep Tests Maintainable**
Use Page Object Model pattern. When UI changes, update one place, not ten tests.

### 5. **Test Data Should Be Self-Contained**
Each test generates its own minimal dataset using test-utils factories. Tests never depend on external fixture files or shared data generation. When a test fails, the data requirements are visible in the test file itself, making debugging immediate.

---

## Key Decisions

**Tool:** Playwright  
**Test Count:** 5-7 critical paths only  
**Test Data:** Generated inline per test using test-utils factories  
**API Mocking:** Mock all dataset requests with dynamically generated data  
**Environment:** Dev server (fast feedback, source maps)  
**Debugging:** Traces, screenshots, videos on failure

---

## Critical Requirements

### data-testid Usage
**Rule:** Add ONLY to primary interaction points (~15-20 total)

```typescript
// ✅ Add to interactive controls
<button data-testid="lens-time">Time</button>
<select data-testid="plugin-selector">...</select>
<input data-testid="timeline-scrubber" type="range" />

// ❌ Don't add to content/styling elements  
<div class="treemap-cell">...</div>  // Use CSS selectors instead
<span class="label">...</span>       // Use text/role selectors
```

**Naming:** kebab-case, descriptive: `plugin-selector`, `lens-coupling`, `filter-dormant`

---

### Test Data Generation
**Rule:** Generate data inline per test using test-utils factories

Each test scenario creates its own minimal dataset. Data is generated at the start of each test, specific to what that test needs to verify.

```typescript
// tests/e2e/specs/treemap-explorer.spec.ts
import { test, expect } from '@playwright/test';
import { createActiveFile, createDormantFile } from '@/test-utils';
import { mockDatasetAPI } from '../utils/mock-api';
import { TreemapPage } from '../utils/page-objects';

test.describe('Treemap Explorer - Author Filtering', () => {
  test('should filter by author alice', async ({ page }) => {
    // Generate data RIGHT HERE - specific to this test
    const testData = {
      files: [
        createActiveFile({ 
          path: 'src/auth.ts', 
          author: 'alice@test.com',
          commits: 25 
        }),
        createActiveFile({ 
          path: 'src/utils.ts', 
          author: 'bob@test.com',
          commits: 10 
        }),
        createDormantFile({ 
          path: 'src/legacy.ts', 
          author: 'alice@test.com',
          commits: 100 
        }),
      ]
    };
    
    await mockDatasetAPI(page, testData);
    
    const treemap = new TreemapPage(page);
    await treemap.goto();
    await treemap.filterByAuthor('alice@test.com');
    
    expect(await treemap.getCellCount()).toBe(2); // auth.ts + legacy.ts
  });
});
```

**Why this works:**
- ✅ Test documents its own data requirements
- ✅ No separate build step needed
- ✅ No fixture files to maintain
- ✅ Each test is self-contained
- ✅ Easy to create edge cases (empty dataset, single file, etc.)
- ✅ Changes to one test's data never affect other tests

---

### API Mocking  
**Rule:** Mock all dataset requests with dynamically generated data

```typescript
// tests/e2e/utils/mock-api.ts
import { Page } from '@playwright/test';

interface TestFile {
  path: string;
  author?: string;
  commits?: number;
  healthScore?: number;
  additions?: number;
  deletions?: number;
}

interface TestDataset {
  files: TestFile[];
  dateRange?: [string, string];
}

export async function mockDatasetAPI(page: Page, dataset: TestDataset) {
  // Transform test data into expected API format
  const files = dataset.files.map((f, idx) => ({
    key: f.path,
    path: f.path,
    current_name: f.path,
    language: f.path.endsWith('.ts') ? 'TypeScript' : 'JavaScript',
    additions: f.additions ?? 100,
    deletions: f.deletions ?? 20,
    commits: f.commits ?? 5,
    authors: f.author ? [f.author] : ['default@test.com'],
    created_at: dataset.dateRange?.[0] ?? '2024-01-01',
    last_modified: dataset.dateRange?.[1] ?? '2024-12-31',
  }));

  // Build route mapping
  const routes = {
    'manifest.json': {
      repository: 'test-repo',
      datasets: {
        file_metadata: { file: 'metadata/file_index.json', production_ready: true },
        temporal_daily: { file: 'aggregations/temporal_daily.json', production_ready: true },
      }
    },
    'metadata/file_index.json': {
      files: Object.fromEntries(files.map(f => [f.key, f]))
    },
    'aggregations/temporal_daily.json': {
      temporal_data: files.map(f => ({
        file_key: f.key,
        date: f.last_modified,
        commits: f.commits,
        additions: f.additions,
        deletions: f.deletions,
      }))
    },
  };

  // Mock all dataset API calls
  await page.route('**/DATASETS_excalidraw/**', route => {
    const url = route.request().url();
    const filename = url.split('/').slice(-2).join('/');
    
    const data = routes[filename];
    if (data) {
      route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify(data) 
      });
    } else {
      route.abort('failed');
    }
  });
}
```

**Why this works:**
- ✅ Single route matcher handles all datasets
- ✅ Manifest auto-generates from provided data
- ✅ Missing datasets return 404 (explicit failures)
- ✅ Easy to test partial dataset scenarios
- ✅ Deterministic, fast, no network flakiness

---

### Debugging Configuration
**Rule:** Capture everything on failure

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'retain-on-failure',      // Full execution trace
    screenshot: 'only-on-failure',   // Visual evidence
    video: 'retain-on-failure',      // What happened
  },
});
```

**When test fails:**
```bash
pnpm test:e2e:trace
```

You get: timeline, screenshots, network logs, console output, DOM snapshots.

---

### Page Object Model (Required)
**Rule:** All tests use POMs, no direct selectors in tests

Page objects should return locators and provide user actions, but keep assertions in the test files.

```typescript
// tests/e2e/utils/page-objects.ts
import { Page, Locator } from '@playwright/test';

export class TreemapPage {
  constructor(private page: Page) {}

  // Locator getters
  getLensButton(lens: 'time' | 'coupling' | 'debt'): Locator {
    return this.page.getByTestId(`lens-${lens}`);
  }

  getCells(): Locator {
    return this.page.locator('[data-viz="treemap-cell"]');
  }

  getAuthorFilter(): Locator {
    return this.page.getByTestId('filter-author');
  }

  // User actions
  async goto() {
    await this.page.goto('/?plugin=treemap-explorer');
    await this.page.waitForLoadState('networkidle');
  }

  async switchLens(lens: 'time' | 'coupling' | 'debt') {
    await this.getLensButton(lens).click();
    // Wait for visualization to update
    await this.page.waitForTimeout(300);
  }

  async filterByAuthor(author: string) {
    await this.getAuthorFilter().fill(author);
    await this.page.keyboard.press('Enter');
  }

  async getCellCount(): Promise<number> {
    return await this.getCells().count();
  }
}

// Usage in tests - assertions are visible
test('should switch lenses', async ({ page }) => {
  const treemap = new TreemapPage(page);
  await treemap.goto();
  await treemap.switchLens('coupling');
  
  // Assertion happens in test, not hidden in POM
  await expect(treemap.getLensButton('coupling')).toHaveClass(/active/);
  expect(await treemap.getCellCount()).toBeGreaterThan(0);
});
```

**Why this works:**
- ✅ Tests read like user stories
- ✅ Page object is a vocabulary of user actions + element locators
- ✅ Easy to compose complex assertions
- ✅ When selectors change, update POM once, not every test

---

## Test Suite Scope

### Critical Paths Only (5-7 Tests)

1. **Smoke** - App loads, plugin selector visible
2. **Plugin Loading** - Load TreemapExplorer, cells render
3. **Lens Switching** - Switch between Time/Coupling/Debt modes
4. **Timeline Scrubbing** - Drag timeline, cells update
5. **Filtering** - Apply filter, verify results
6. *(Optional)* File selection and detail panel
7. *(Optional)* Export functionality

**Don't test:** Every edge case, data processing logic (unit tests), styling details

---

## Directory Structure

```
tests/e2e/
├── specs/
│   ├── smoke.spec.ts
│   ├── plugin-loading.spec.ts
│   ├── lens-switching.spec.ts
│   ├── timeline.spec.ts
│   └── filtering.spec.ts
├── utils/
│   ├── mock-api.ts           # Dynamic data mocking
│   └── page-objects.ts       # Page Object Models
└── playwright.config.ts
```

**Note:** No `fixtures/` directory - all data is generated inline within test files.

---

## Configuration

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true,
  
  use: {
    baseURL: 'http://localhost:5173',
    
    // Debugging: capture on failure
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],

  // Auto-start dev server
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
```

### package.json Scripts
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:trace": "playwright show-trace test-results/*/trace.zip"
  }
}
```

---

## Setup Steps

```bash
# 1. Install Playwright
pnpm add -D @playwright/test
pnpm exec playwright install

# 2. Create directory structure
mkdir -p tests/e2e/{specs,utils}

# 3. Create mock-api helper
# Copy example from "API Mocking" section above

# 4. Create page objects
# Copy TreemapPage from "Page Object Model" section

# 5. Write smoke test with inline data generation
# Copy example from "Test Data Generation" section

# 6. Run tests
pnpm test:e2e
```

---

## When Tests Fail

```bash
# Interactive trace viewer (best debugging)
pnpm test:e2e:trace

# UI mode (see tests visually)
pnpm test:e2e:ui

# Debug mode (step through)
pnpm test:e2e:debug
```

You get: execution timeline, screenshots, network logs, console output, DOM state.

---

## Common Test Patterns

### Pattern 1: Minimal Dataset for Smoke Test
```typescript
test('should load application', async ({ page }) => {
  const testData = {
    files: [
      createActiveFile({ path: 'src/app.ts' })
    ]
  };
  
  await mockDatasetAPI(page, testData);
  await page.goto('/');
  
  await expect(page.getByTestId('plugin-selector')).toBeVisible();
});
```

### Pattern 2: Scenario-Specific Dataset
```typescript
test('should highlight dormant files', async ({ page }) => {
  const testData = {
    files: [
      createActiveFile({ path: 'src/active.ts', healthScore: 85 }),
      createDormantFile({ path: 'src/dormant.ts', healthScore: 30 }),
    ]
  };
  
  await mockDatasetAPI(page, testData);
  const treemap = new TreemapPage(page);
  await treemap.goto();
  
  const dormantCell = treemap.getCells().filter({ hasText: 'dormant.ts' });
  await expect(dormantCell).toHaveCSS('fill', /red/);
});
```

### Pattern 3: Edge Case Testing
```typescript
test('should handle empty dataset', async ({ page }) => {
  const testData = { files: [] };
  
  await mockDatasetAPI(page, testData);
  await page.goto('/');
  
  await expect(page.getByText('No data available')).toBeVisible();
});
```

---

## Key Adherence Points

### ✅ DO:
- Add data-testid ONLY to interaction points
- Use Page Object Model for all tests
- Generate test data inline per test
- Mock all API calls with dynamic data
- Capture traces on failure
- Keep suite to 5-7 tests
- Import factories from test-utils

### ❌ DON'T:
- Add testids to every element
- Write tests without POMs
- Create separate fixture generation scripts
- Check test data files into git
- Test data processing logic (use unit tests)
- Test every UI variation
- Skip debugging configuration
- Let suite grow beyond 10 tests

---

## Migration from Old Approach

If you're updating from the old fixture-based approach:

1. **Remove fixture files**: Delete `tests/e2e/fixtures/` directory
2. **Remove fixture builder**: Delete `tests/e2e/utils/fixture-builder.ts`
3. **Remove npm scripts**: Delete `e2e:fixtures` command from package.json
4. **Create mock-api helper**: Add dynamic mocking utility
5. **Update tests**: Replace `loadFixture()` calls with inline `mockDatasetAPI(page, testData)`
6. **Verify**: Run `pnpm test:e2e` to ensure all tests pass

---

## Summary

**Philosophy:** E2E tests verify critical user paths work. Unit/integration tests handle the details. Test data is generated inline, specific to each test scenario.

**When to add E2E test:** Only when testing a critical user journey end-to-end.

**When to expand existing test:** Never. Add unit/integration test instead.

**Debugging first:** Every test failure should be quickly diagnosable with traces and self-contained test data.

---

## References

- [Playwright Documentation](https://playwright.dev)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Page Object Model](https://playwright.dev/docs/pom)