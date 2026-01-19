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

The mock API must generate all required datasets (`file_index`, `file_lifecycle`, `directory_stats`, `author_network`) to satisfy the application's data processor.

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
  couplingEdges?: Array<{ source: string; target: string; weight: number }>;
}

export async function mockDatasetAPI(page: Page, dataset: TestDataset) {
  // 1. Generate File Data matching V2FileIndex interface
  const files = dataset.files.map((f) => {
    const authorEmail = f.author || 'default@test.com';
    const totalCommits = f.commits ?? 5;
    
    return {
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
      commits_per_day: 1,
      lifecycle_event_count: totalCommits
    };
  });

  // Helper: Convert array to Record<string, T>
  const toRecord = (items: any[], keyField: string = 'key') => {
    return items.reduce((acc, item) => {
      acc[item[keyField]] = item;
      return acc;
    }, {} as Record<string, any>);
  };

  // 2. Generate Directory Stats (Required for Tree Building)
  const dirStats: Record<string, any> = {};
  const processedDirs = new Set<string>();
  files.forEach(f => {
    const parts = f.key.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join('/');
      if (!processedDirs.has(dirPath)) {
        dirStats[dirPath] = { path: dirPath, total_commits: 10, activity_score: 10 };
        processedDirs.add(dirPath);
      }
    }
  });
  if (Object.keys(dirStats).length === 0) {
      dirStats['src'] = { path: 'src', total_commits: 0, activity_score: 0 };
  }

  // 3. Generate Lifecycle Events (Required for Activity Matrix)
  const lifecycleFiles: Record<string, any[]> = {};
  files.forEach(f => {
    lifecycleFiles[f.key] = [{
      commit_hash: 'hash123',
      timestamp: new Date(f.last_modified).getTime() / 1000,
      datetime: f.last_modified,
      operation: 'M',
      author_name: f.primary_author.email.split('@')[0],
      author_email: f.primary_author.email,
      commit_subject: 'Update file'
    }];
  });

  // 4. Build Route Mapping
  const routes: Record<string, any> = {
    'manifest.json': {
      repository: 'test-repo',
      datasets: {
        file_metadata: { file: 'metadata/file_index.json', production_ready: true },
        temporal_daily: { file: 'aggregations/temporal_daily.json', production_ready: true },
        cochange_network: { file: 'networks/cochange_network.json', production_ready: true },
        directory_stats: { file: 'aggregations/directory_stats.json', production_ready: true },
        file_lifecycle: { file: 'file_lifecycle.json', production_ready: true },
        author_network: { file: 'networks/author_network.json', production_ready: true }
      }
    },
    'metadata/file_index.json': {
      files: toRecord(files) // Must be a Record, not Array
    },
    'aggregations/temporal_daily.json': {
      days: files.map(f => ({
        key: f.last_modified,
        date: f.last_modified,
        commits: f.total_commits,
        files_changed: 1,
        unique_authors: 1,
        operations: f.operations
      }))
    },
    'networks/cochange_network.json': {
      edges: dataset.couplingEdges || []
    },
    'aggregations/directory_stats.json': {
      directories: dirStats // Must be a Record
    },
    'file_lifecycle.json': {
      generated_at: new Date().toISOString(),
      repository_path: '/repo',
      total_files: files.length,
      total_commits: 100,
      files: lifecycleFiles // Must be Record<string, Event[]>
    },
    'networks/author_network.json': {
      nodes: files.map(f => ({
        id: f.primary_author.email,
        email: f.primary_author.email,
        commit_count: f.total_commits,
        collaboration_count: 0
      })),
      edges: []
    }
  };

  // Mock all dataset API calls
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
      route.fulfill({ status: 404, body: '{}' });
    }
  });
}
```

**Why this works:**
- ✅ Single route matcher handles all datasets
- ✅ Generates all required datasets to prevent app crashes
- ✅ Correctly formats data as Records vs Arrays where required
- ✅ Dynamically builds directory structure from file paths
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
