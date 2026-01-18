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
Leverage test-utils factories to generate fixtures. Don't reinvent the wheel.

### 4. **Keep Tests Maintainable**
Use Page Object Model pattern. When UI changes, update one place, not ten tests.

---

## Key Decisions

**Tool:** Playwright  
**Test Count:** 5-7 critical paths only  
**Fixtures:** Generated from test-utils, checked into repo  
**API Mocking:** Mock all dataset requests with fixtures  
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

### Fixture Management
**Rule:** Generate from test-utils, check into repo

```typescript
// tests/e2e/utils/fixture-builder.ts
import { createMockFileIndex, createTemporalData } from '@/test-utils';

export function generateFixtures() {
  const fileIndex = createMockFileIndex({ files: createEnrichedFileList(50) });
  writeFileSync('./tests/e2e/fixtures/file_index.json', JSON.stringify(fileIndex));
  
  const temporal = createTemporalData();
  writeFileSync('./tests/e2e/fixtures/temporal_daily.json', JSON.stringify(temporal));
}
```

**Usage:**
```bash
pnpm e2e:fixtures  # Regenerate when data structure changes
```

**Check fixtures into git** - makes failures debuggable without regeneration.

---

### API Mocking  
**Rule:** Mock all dataset requests with fixtures

```typescript
// Global setup for all tests
test.beforeEach(async ({ page }) => {
  await page.route('**/DATASETS_**/*.json', async (route) => {
    const filename = route.request().url().split('/').pop();
    const fixture = await loadFixture(filename);
    await route.fulfill({ 
      status: 200,
      body: JSON.stringify(fixture) 
    });
  });
});
```

**Why:** Deterministic, fast, no network flakiness.

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
pnpm exec playwright show-trace test-results/*/trace.zip
```

You get: timeline, screenshots, network logs, console output, DOM snapshots.

---

### Page Object Model (Required)
**Rule:** All tests use POMs, no direct selectors in tests

```typescript
// tests/e2e/utils/page-objects.ts
export class TreemapExplorerPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/?plugin=treemap-explorer');
    await this.page.locator('.treemap-cell').first().waitFor();
  }

  async switchToLens(lens: 'time' | 'coupling' | 'debt') {
    await this.page.click(`[data-testid="lens-${lens}"]`);
  }

  async getCellCount() {
    return await this.page.locator('.treemap-cell').count();
  }
}

// Usage in tests
test('should switch lenses', async ({ page }) => {
  const treemap = new TreemapExplorerPage(page);
  await treemap.goto();
  await treemap.switchToLens('coupling');
  expect(await treemap.getCellCount()).toBeGreaterThan(0);
});
```

**Why:** When selectors change, update POM once, not every test.

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
├── fixtures/
│   ├── datasets/
│   │   ├── file_index.json
│   │   ├── temporal_daily.json
│   │   └── cochange_network.json
│   └── fixture-loader.ts
├── specs/
│   ├── smoke.spec.ts
│   ├── plugin-loading.spec.ts
│   ├── lens-switching.spec.ts
│   ├── timeline.spec.ts
│   └── filtering.spec.ts
├── utils/
│   ├── fixture-builder.ts
│   └── page-objects.ts
└── playwright.config.ts
```

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
    "e2e:fixtures": "ts-node tests/e2e/utils/fixture-builder.ts",
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
mkdir -p tests/e2e/{fixtures/datasets,specs,utils}

# 3. Create fixture builder (using test-utils)
# Copy example from "Fixture Management" section above

# 4. Generate initial fixtures
pnpm e2e:fixtures

# 5. Create first POM
# Copy TreemapExplorerPage from "Page Object Model" section

# 6. Write smoke test
# Copy example from "Test Suite Scope" section

# 7. Run tests
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

## Key Adherence Points

### ✅ DO:
- Add data-testid ONLY to interaction points
- Use Page Object Model for all tests
- Check fixtures into git
- Mock all API calls
- Capture traces on failure
- Keep suite to 5-7 tests

### ❌ DON'T:
- Add testids to every element
- Write tests without POMs
- Test data processing logic (use unit tests)
- Test every UI variation
- Skip debugging configuration
- Let suite grow beyond 10 tests

---

## Summary

**Philosophy:** E2E tests verify critical paths work. Unit/integration tests handle the details.

**When to add E2E test:** Only when testing a critical user journey end-to-end.

**When to expand existing test:** Never. Add unit/integration test instead.

**Debugging first:** Every test failure should be quickly diagnosable with traces.

---

## References

- [Playwright Documentation](https://playwright.dev)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Page Object Model](https://playwright.dev/docs/pom)
