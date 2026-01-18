# Test Infrastructure Refactoring Plan
## Git-Viz Project Testing Improvement

**Created:** January 2026  
**Current Status:** 144 passing tests, B- grade (70/100)  
**Goal:** Achieve A+ scalable testing infrastructure without breaking existing tests

---

## ⚠️ IMPORTANT: Working Protocol for Implementation

**Due to token limits, the complete codebase cannot be shared in a single session.** During implementation, files will be provided incrementally as needed for each step. **Do not make assumptions about the local codebase beyond what is explicitly shared.** If you need to verify file contents, directory structures, import paths, type definitions, or any other aspect of the codebase before proceeding, **explicitly request specific files or command outputs** (e.g., `cat src/path/to/file.ts`, `grep -r "import.*TemporalFileData" src/`, `tree src/test-utils -L 2`, `find src -name "*.test.ts"`). This protocol ensures we remain aligned throughout the refactor and avoids introducing bugs or breaking changes based on incorrect assumptions. When in doubt, always ask first.

---

## Executive Summary

This plan refactors the testing infrastructure incrementally, ensuring **zero regression** while establishing scalable patterns. Each phase is designed to be completed independently with full rollback capability.

**Total Estimated Time:** 8-12 hours across 3 sessions  
**Risk Level:** LOW (incremental, backward-compatible approach)

---

## Version Control Strategy

### Branch Structure

```bash
main
  └── refactor/test-infrastructure  (feature branch - ALL work happens here)
      ├── phase-1-foundation       (checkpoint branch - optional)
      ├── phase-2-migration        (checkpoint branch - optional)
      └── phase-3-advanced         (checkpoint branch - optional)
```

### Initial Setup

```bash
# 1. Ensure clean working directory
git status
# Should show: "nothing to commit, working tree clean"

# 2. Create feature branch from main
git checkout main
git pull origin main
git checkout -b refactor/test-infrastructure

# 3. Verify you're on the correct branch
git branch
# Should show: * refactor/test-infrastructure
```

### Commit Organization

Each phase will have **multiple atomic commits** following this structure:

#### Phase 1: Foundation Commits
```bash
# Commit 1: Project setup
refactor(test): initialize test-utils directory structure

# Commit 2: Factory implementations
refactor(test): add mock data factories for domain types

# Commit 3: Render utilities
refactor(test): add custom render with provider support

# Commit 4: Shared mocks
refactor(test): add shared test mocks and helpers

# Commit 5: Enhanced setup
refactor(test): enhance setupTests with global mocks

# Commit 6: Configuration updates
refactor(test): update configs for test-utils path alias

# Commit 7: Coverage scripts
refactor(test): add coverage and test UI scripts

# Checkpoint commit (tags the completion of Phase 1)
git tag -a phase-1-complete -m "Phase 1: Foundation complete - all 144 tests passing"
```

#### Phase 2: Migration Commits (Per-File Pattern)
```bash
# One commit per migrated test file
refactor(test): migrate DatasetRegistry tests to test-utils
refactor(test): migrate PluginRegistry tests to test-utils
refactor(test): migrate TimeView tests to test-utils
refactor(test): migrate CouplingView tests to test-utils
# ... (11 total migration commits)

# Checkpoint commit
git tag -a phase-2-complete -m "Phase 2: Migration complete - all tests use test-utils"
```

#### Phase 3: Advanced Commits (If Implemented)
```bash
refactor(test): add custom test matchers
refactor(test): optimize test performance with thread pool
refactor(test): add integration test suite separation

git tag -a phase-3-complete -m "Phase 3: Advanced patterns complete"
```

### Commit Message Convention

Follow **Conventional Commits** specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types used in this refactor:**
- `refactor(test):` - Restructuring test code without changing behavior
- `test:` - Adding or modifying tests
- `chore(test):` - Tooling/config changes (coverage, scripts)
- `docs(test):` - Test documentation updates

**Examples:**
```bash
# Good commit messages
refactor(test): add TemporalFileData factory with preset variants
refactor(test): migrate TimeView tests to use test-utils factories
chore(test): add vitest UI and coverage dependencies
test: add custom matcher for dormant file validation

# Bad commit messages (avoid these)
fix tests
update tests
WIP
changes
```

### Commit Best Practices for This Refactor

1. **Atomic Commits** - Each commit should:
   - Represent one logical change
   - Pass all tests (`pnpm test`)
   - Be revertable independently

2. **Commit After Each Success**
   ```bash
   # After creating factories.ts
   git add src/test-utils/factories.ts
   git commit -m "refactor(test): add mock data factories for domain types"
   pnpm test  # Verify still passing
   
   # After creating render.tsx
   git add src/test-utils/render.tsx
   git commit -m "refactor(test): add custom render with provider support"
   pnpm test
   ```

3. **Never Commit Broken Tests**
   ```bash
   # Always verify before committing
   pnpm test
   # Only if ALL tests pass:
   git commit -m "..."
   ```

### Checkpoint Strategy

Create **checkpoint branches** after completing each phase for easy rollback:

```bash
# After Phase 1 complete and verified
git checkout -b checkpoint/phase-1-foundation
git checkout refactor/test-infrastructure

# After Phase 2 complete and verified
git checkout -b checkpoint/phase-2-migration
git checkout refactor/test-infrastructure

# After Phase 3 complete and verified
git checkout -b checkpoint/phase-3-advanced
git checkout refactor/test-infrastructure
```

**Why checkpoints?**
- Easy rollback to any phase: `git checkout checkpoint/phase-1-foundation`
- Compare phases: `git diff checkpoint/phase-1-foundation checkpoint/phase-2-migration`
- Safety net if Phase 2+ goes wrong

### Rollback Procedures

#### Rollback Last Commit
```bash
# Undo last commit, keep changes
git reset --soft HEAD~1

# Undo last commit, discard changes
git reset --hard HEAD~1
```

#### Rollback to Phase Start
```bash
# See commit history
git log --oneline

# Rollback to specific commit
git reset --hard <commit-hash>

# Or rollback to checkpoint
git reset --hard checkpoint/phase-1-foundation
```

#### Rollback Entire Refactor
```bash
# Nuclear option - back to main
git checkout main
git branch -D refactor/test-infrastructure

# Start fresh
git checkout -b refactor/test-infrastructure
```

### Working with Stashes

If you need to switch context mid-phase:

```bash
# Save current work
git stash save "WIP: implementing factories.ts"

# List stashes
git stash list

# Restore work
git stash pop

# Or apply without removing from stash
git stash apply stash@{0}
```

### Pre-Merge Checklist

Before merging to `main`:

```bash
# 1. Ensure all tests pass
pnpm test
# Expected: ✓ 144 tests passing

# 2. Ensure type checking passes
pnpm type-check
# Expected: no errors

# 3. Run build to verify production
pnpm build
# Expected: successful build

# 4. Verify coverage works
pnpm test:coverage
# Expected: coverage report generated

# 5. Review all commits
git log --oneline refactor/test-infrastructure

# 6. Squash if needed (optional)
git rebase -i main

# 7. Update main and rebase
git checkout main
git pull origin main
git checkout refactor/test-infrastructure
git rebase main

# 8. Force push if rebased (only if needed)
git push origin refactor/test-infrastructure --force-with-lease
```

### Pull Request Guidelines

**PR Title:**
```
refactor(test): establish scalable test infrastructure with utilities
```

**PR Description Template:**
```markdown
## Summary
Refactors test infrastructure to use centralized utilities, factories, and enhanced setup for improved maintainability and scalability.

## Changes by Phase

### Phase 1: Foundation ✅
- Created `src/test-utils/` directory with factories, mocks, helpers
- Enhanced `setupTests.ts` with global SVG/Canvas mocks
- Added test coverage and UI scripts
- Updated configs for `@/test-utils` path alias

### Phase 2: Migration ✅
- Migrated 11 test files to use test-utils
- Reduced test code by ~50% (2000+ lines → 1000 lines)
- Eliminated duplicated mock data

### Phase 3: Advanced (if completed)
- Added custom matchers
- Optimized test performance
- Separated integration tests

## Test Results
- ✅ All 144 tests passing
- ✅ Type checking passes
- ✅ Build successful
- ✅ Coverage: 75% (up from N/A)

## Breaking Changes
None - backward compatible refactor

## Migration Impact
- **Before:** 2000+ lines of duplicated mocks
- **After:** 295 lines of reusable utilities
- **Maintenance:** Mock updates now require 1 file change vs 11

## Checklist
- [x] All tests passing
- [x] Type checking passes
- [x] Build successful
- [x] No breaking changes
- [x] Documentation updated
- [x] Self-reviewed code
```

### Git Commands Quick Reference

```bash
# === Branch Management ===
git branch                              # List branches
git checkout -b <branch-name>          # Create and switch
git branch -d <branch-name>            # Delete branch (safe)
git branch -D <branch-name>            # Force delete

# === Committing ===
git status                             # Check status
git add <file>                         # Stage file
git add .                              # Stage all
git commit -m "message"                # Commit
git commit --amend                     # Modify last commit

# === History ===
git log --oneline                      # Compact history
git log --oneline --graph              # Visual history
git show <commit-hash>                 # Show commit details

# === Undoing ===
git reset --soft HEAD~1                # Undo commit, keep changes
git reset --hard HEAD~1                # Undo commit, discard changes
git checkout -- <file>                 # Discard file changes

# === Tagging ===
git tag -a <tag-name> -m "message"    # Create annotated tag
git tag -l                             # List tags
git push origin <tag-name>             # Push tag to remote

# === Remote ===
git push origin <branch-name>          # Push branch
git push origin --tags                 # Push all tags
git pull origin <branch-name>          # Pull updates
```

---

## Current State Analysis

### Test Suite Snapshot
```
Test Files:  11 passed (11)
Tests:       144 passed (144)
Duration:    1.91s (transform 1.02s, setup 949ms, tests 605ms)
```

### File Structure
```
src/
├── setupTests.ts                    # Minimal setup (1 import)
├── plugins/
│   ├── core/__tests__/             # 17 tests - PluginRegistry
│   └── treemap-explorer/
│       ├── __tests__/              # 21 tests - Integration
│       ├── components/__tests__/   # 53 tests - Components
│       ├── renderers/__tests__/    # 5 tests - Rendering
│       └── utils/__tests__/        # 4 tests - Utilities
├── services/data/__tests__/        # 25 tests - Data processing
└── store/__tests__/                # 19 tests - State management
```

### Technology Stack
- **Test Runner:** Vitest 4.0.17
- **Component Testing:** @testing-library/react 16.3.1
- **Assertions:** Vitest + @testing-library/jest-dom 6.9.1
- **Mocking:** Vitest's vi
- **Build:** Vite 5.0.8 with TypeScript 5.3.3

### Key Dependencies
```typescript
// Path aliases (tsconfig.json & vite.config.ts)
"@/*": ["src/*"]
"@/types/*": ["src/types/*"]
"@/services/*": ["src/services/*"]
"@/store/*": ["src/store/*"]
"@/plugins/*": ["src/plugins/*"]
"@/components/*": ["src/components/*"]
"@/utils/*": ["src/utils/*"]
```

---

## Critical Constraints & Risks

### ⚠️ MUST PRESERVE
1. **All 144 tests must pass** after each phase
2. **Existing test file structure** - tests stay co-located
3. **Import paths** - existing `@/` aliases continue working
4. **CI/CD compatibility** - test commands remain the same
5. **Type safety** - no `any` types, maintain strict mode

### 🔴 HIGH-RISK AREAS
1. **D3 Visualizations** - Tests use DOM manipulation, SVG rendering
2. **Fake Timers** - Multiple tests use `vi.useFakeTimers()`
3. **Plugin Integration Tests** - Complex state management with DOM
4. **setupTests.ts** - Changes affect ALL tests globally

### 🟡 MEDIUM-RISK AREAS
1. **Mock Data Structures** - Used in 50+ places, types may drift
2. **jsdom Environment** - Tests depend on browser APIs
3. **Path Resolution** - Test imports use aliases extensively

---

## Phase 1: Foundation Setup (NO Breaking Changes)
**Estimated Time:** 2-3 hours  
**Risk:** LOW  
**Rollback:** Delete new files, no existing code changed

### Objectives
- Create test utilities infrastructure
- Establish factory pattern for mock data
- Add enhanced test setup
- Enable coverage reporting

### Git Workflow for Phase 1

```bash
# Ensure you're on the feature branch
git checkout refactor/test-infrastructure

# Verify clean state
git status

# Each step below includes a commit checkpoint
```

### Implementation Steps

#### Step 1.1: Create Test Utilities Directory

**Git Checkpoint: Project Structure**
**Files to Create:**
```
src/
└── test-utils/
    ├── index.ts              # Main export
    ├── factories.ts          # Mock data factories
    ├── render.tsx           # Custom render utilities
    ├── mocks.ts             # Shared mocks
    └── helpers.ts           # Test helper functions
```

#### Step 1.2: Factory Implementation
**File:** `src/test-utils/factories.ts`

**Purpose:** Eliminate duplicated mock data across 11 test files

**Current Pain Point:**
```typescript
// This exact pattern appears in 3+ test files
const mockActiveFile: TemporalFileData = {
  key: "src/components/Button.tsx",
  name: "Button.tsx",
  path: "src/components/Button.tsx",
  total_commits: 45,
  unique_authors: 5,
  // ... 20 more lines
};
```

**Solution Pattern:**
```typescript
import { TemporalFileData } from "@/services/data/TemporalDataProcessor";

/**
 * Factory for creating TemporalFileData test fixtures
 * Used across: TimeView.test.tsx, TreemapExplorer.test.ts
 */
export const createMockTemporalFile = (
  overrides?: Partial<TemporalFileData>
): TemporalFileData => ({
  // Default active file
  key: "src/components/Button.tsx",
  name: "Button.tsx",
  path: "src/components/Button.tsx",
  total_commits: 45,
  unique_authors: 5,
  totalCommits: 45,
  uniqueAuthors: 5,
  operations: { M: 35, A: 10, D: 0 },
  age_days: 120,
  first_seen: "2025-09-01",
  last_modified: "2026-01-10",
  createdDate: "2025-09-01",
  lastModifiedDate: "2026-01-10",
  dormantDays: 7,
  isDormant: false,
  createdPosition: 65,
  isVisible: true,
  ageDays: 138,
  activityTimeline: [
    { date: "2025-09-01", commits: 10 },
    { date: "2025-11-01", commits: 20 },
    { date: "2026-01-10", commits: 15 },
  ],
  ...overrides, // Allow test-specific overrides
});

/**
 * Preset for dormant files
 * Used in: TimeView.test.tsx (3 tests), TreemapExplorer.test.ts
 */
export const createDormantFile = (
  overrides?: Partial<TemporalFileData>
): TemporalFileData =>
  createMockTemporalFile({
    key: "src/legacy/OldUtils.ts",
    name: "OldUtils.ts",
    path: "src/legacy/OldUtils.ts",
    total_commits: 120,
    unique_authors: 8,
    totalCommits: 120,
    uniqueAuthors: 8,
    operations: { M: 100, A: 20, D: 0 },
    age_days: 600,
    first_seen: "2023-01-15",
    last_modified: "2023-08-20",
    createdDate: "2023-01-15",
    lastModifiedDate: "2023-08-20",
    dormantDays: 881,
    isDormant: true,
    createdPosition: 15,
    isVisible: true,
    ageDays: 1098,
    activityTimeline: [],
    ...overrides,
  });

/**
 * Factory for file_index dataset structure
 * Used in: TreemapExplorer.integration.test.ts, DataProcessor tests
 */
export const createMockFileIndex = (overrides?: {
  files?: Array<Partial<TemporalFileData>>;
}) => ({
  files: overrides?.files?.map(f => createMockTemporalFile(f)) || [
    createMockTemporalFile(),
  ],
});

/**
 * Factory for temporal_daily dataset structure
 * Used in: TemporalDataProcessor.test.ts, TreemapExplorer.test.ts
 */
export const createMockTemporalData = () => ({
  date_range: {
    min: "2022-01-01",
    max: "2025-01-15",
    total_days: 1110,
  },
  days: [
    { date: "2022-01-01", commits: 5, files_changed: 2, unique_authors: 1 },
    { date: "2022-06-01", commits: 30, files_changed: 10, unique_authors: 3 },
    { date: "2024-07-01", commits: 15, files_changed: 5, unique_authors: 2 },
    { date: "2025-01-01", commits: 20, files_changed: 8, unique_authors: 4 },
    { date: "2025-01-15", commits: 10, files_changed: 3, unique_authors: 2 },
  ],
});

/**
 * Factory for TreemapExplorerState
 * Used in: TreemapExplorer tests (21 tests)
 */
export const createMockTreemapState = (
  overrides?: Partial<TreemapExplorerState>
): TreemapExplorerState => ({
  lensMode: "time",
  sizeMetric: "commits",
  selectedFile: null,
  healthThreshold: 50,
  couplingThreshold: 0.03,
  showArcs: true,
  timePosition: 100,
  playing: false,
  timeFilters: {
    showCreations: false,
    fadeDormant: true,
  },
  ...overrides,
});
```

**Types to Import:**
```typescript
// From existing codebase
import { TemporalFileData } from "@/services/data/TemporalDataProcessor";
import { TreemapExplorerState } from "@/plugins/treemap-explorer/types";
```

**Commit Checkpoint:**
```bash
# After creating factories.ts
git add src/test-utils/factories.ts
git commit -m "refactor(test): add mock data factories for domain types

- Add createMockTemporalFile factory with override support
- Add createDormantFile preset for legacy file testing
- Add createMockFileIndex for dataset structure
- Add createMockTemporalData for time series testing
- Add createMockTreemapState for plugin state testing"

# Verify tests still pass
pnpm test
# Expected: ✓ 144 tests passing (no change)
```

#### Step 1.3: Enhanced setupTests.ts
**File:** `src/setupTests.ts`

**Current Content:**
```typescript
import "@testing-library/jest-dom";
```

**New Content:**
```typescript
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// ============================================================================
// GLOBAL TEST SETUP
// This file runs before ALL tests
// Changes here affect: 144 tests across 11 files
// ============================================================================

// -----------------------------------------------------------------------------
// Auto-cleanup React components after each test
// Prevents memory leaks and test pollution
// -----------------------------------------------------------------------------
afterEach(() => {
  cleanup();
});

// -----------------------------------------------------------------------------
// Mock Canvas API (required for D3 visualizations)
// Used by: CouplingArcRenderer.test.ts, TreemapExplorer tests
// -----------------------------------------------------------------------------
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
})) as any;

// -----------------------------------------------------------------------------
// Mock SVG methods (required for D3 treemap/timeline)
// Used by: All treemap-explorer tests, timeline-heatmap tests
// -----------------------------------------------------------------------------
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  writable: true,
  value: vi.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }),
});

Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
  writable: true,
  value: vi.fn().mockReturnValue(100),
});

// -----------------------------------------------------------------------------
// Mock IntersectionObserver (used by scroll indicators)
// Used by: useScrollIndicators.tsx tests (if added)
// -----------------------------------------------------------------------------
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as any;

// -----------------------------------------------------------------------------
// Mock ResizeObserver (used by responsive components)
// Used by: Plugin rendering tests that resize containers
// -----------------------------------------------------------------------------
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// -----------------------------------------------------------------------------
// Mock window.matchMedia (used by responsive UI)
// Used by: Component tests checking mobile/desktop views
// -----------------------------------------------------------------------------
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// -----------------------------------------------------------------------------
// Suppress console warnings in tests (optional)
// Comment out if you need to debug console output
// -----------------------------------------------------------------------------
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
```

**Commit Checkpoint:**
```bash
git add src/setupTests.ts
git commit -m "refactor(test): enhance setupTests with global mocks

- Add auto-cleanup after each test to prevent memory leaks
- Mock Canvas API for D3 visualization tests
- Mock SVG methods (getBBox, getComputedTextLength) for treemap tests
- Mock IntersectionObserver for scroll indicator tests
- Mock ResizeObserver for responsive component tests
- Mock window.matchMedia for responsive UI tests
- Suppress console warnings in test environment

Fixes rendering issues in:
- CouplingArcRenderer tests
- TreemapExplorer integration tests
- Timeline visualization tests"

pnpm test  # Verify: ✓ 144 tests passing
```

#### Step 1.4: Custom Render Utility
**File:** `src/test-utils/render.tsx`

**Purpose:** Future-proof render function that can add providers

```typescript
import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

/**
 * Custom render function with future provider support
 * 
 * Usage (backward compatible):
 *   import { render } from "@/test-utils";
 *   render(<MyComponent />);
 * 
 * Future with providers:
 *   render(<MyComponent />, { withStore: true });
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Future: Add provider options here
  // withStore?: boolean;
  // initialState?: Partial<AppState>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  // Currently no wrapper, but structure is ready
  // Future: Wrap with providers based on options
  return render(ui, { ...options });
}

// Re-export everything from RTL
export * from "@testing-library/react";

// Export custom render as default
export { renderWithProviders as render };
```

**Commit Checkpoint:**
```bash
git add src/test-utils/render.tsx
git commit -m "refactor(test): add custom render with provider support

- Add renderWithProviders wrapper for future context injection
- Re-export all RTL utilities for convenience
- Maintain backward compatibility with standard render
- Structure ready for store/router providers"

pnpm test  # Verify: ✓ 144 tests passing
```

#### Step 1.5: Shared Mocks
**File:** `src/test-utils/mocks.ts`

```typescript
import { vi } from "vitest";

/**
 * Mock DOM container for plugin tests
 * Used by: TreemapExplorer, TimelineHeatmap integration tests
 */
export const createMockContainer = (
  width = 800,
  height = 600
): HTMLElement => {
  const container = document.createElement("div");
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);
  return container;
};

/**
 * Cleanup function for DOM containers
 */
export const destroyMockContainer = (container: HTMLElement): void => {
  if (container.parentNode) {
    document.body.removeChild(container);
  }
};

/**
 * Mock fetch responses for data loading
 */
export const createMockFetch = (data: any) => {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    })
  ) as any;
};

/**
 * Utility to wait for async operations
 */
export const waitForAsync = () => 
  new Promise((resolve) => setTimeout(resolve, 0));
```

**Commit Checkpoint:**
```bash
git add src/test-utils/mocks.ts
git commit -m "refactor(test): add shared test mocks and helpers

- Add createMockContainer for plugin DOM testing
- Add destroyMockContainer cleanup utility
- Add createMockFetch for data loading tests
- Add waitForAsync for handling promises in tests"

pnpm test  # Verify: ✓ 144 tests passing
```

#### Step 1.6: Test Helpers
**File:** `src/test-utils/helpers.ts`

```typescript
/**
 * Time-related test helpers
 * Used with vi.useFakeTimers()
 */
export const testDates = {
  /** Fixed reference date for tests */
  reference: new Date("2026-01-17"),
  
  /** Old date for dormant files */
  dormant: new Date("2023-08-20"),
  
  /** Recent date for active files */
  recent: new Date("2026-01-10"),
  
  /** Format for ISO strings */
  toISO: (date: Date) => date.toISOString().split("T")[0],
};

/**
 * Calculate days between dates (matches app logic)
 */
export const daysBetween = (start: Date, end: Date): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
};

/**
 * Assert array contains items matching predicate
 */
export const assertIncludes = <T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string
) => {
  const found = array.some(predicate);
  if (!found) {
    throw new Error(message || "Array does not include expected item");
  }
};
```

**Commit Checkpoint:**
```bash
git add src/test-utils/helpers.ts
git commit -m "refactor(test): add time and assertion test helpers

- Add testDates constants for consistent date mocking
- Add daysBetween utility matching app logic
- Add assertIncludes for array predicate testing
- Support fake timer test patterns"

pnpm test  # Verify: ✓ 144 tests passing
```

#### Step 1.7: Main Export
**File:** `src/test-utils/index.ts`

```typescript
/**
 * Test Utilities Entry Point
 * 
 * Import everything you need:
 *   import { render, createMockTemporalFile } from "@/test-utils";
 */

export * from "./factories";
export * from "./render";
export * from "./mocks";
export * from "./helpers";
```

**Commit Checkpoint:**
```bash
git add src/test-utils/index.ts
git commit -m "refactor(test): add test-utils main export

- Centralize all test utility exports
- Enable single import: import { ... } from '@/test-utils'
- Organize exports by category (factories, render, mocks, helpers)"

pnpm test  # Verify: ✓ 144 tests passing
```

#### Step 1.8: Update tsconfig.json
**File:** `tsconfig.json`

**Add path alias:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@/test-utils": ["src/test-utils"],  // ← ADD THIS
      // ... existing paths
    }
  }
}
```

#### Step 1.9: Update vite.config.ts
**File:** `vite.config.ts`

**Add alias:**
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/test-utils': path.resolve(__dirname, './src/test-utils'),  // ← ADD THIS
      // ... existing aliases
    },
  },
});
```

**Commit Checkpoint:**
```bash
git add tsconfig.json vite.config.ts
git commit -m "refactor(test): configure test-utils path alias

- Add @/test-utils alias to tsconfig.json paths
- Add @/test-utils alias to vite.config.ts resolve
- Enable clean imports: import { ... } from '@/test-utils'
- Maintain consistency with existing @/ aliases"

# Verify type checking still works
pnpm type-check  # Expected: no errors

# Verify tests still pass
pnpm test  # Expected: ✓ 144 tests passing
```

#### Step 1.10: Add Coverage Scripts
**File:** `package.json`

**Add to scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

**Add dependencies:**
```bash
pnpm add -D @vitest/ui @vitest/coverage-v8
```

**Commit Checkpoint:**
```bash
# After adding dependencies
git add package.json pnpm-lock.yaml
git commit -m "chore(test): add coverage and UI test scripts

- Add test:ui script for visual test runner
- Add test:coverage script for coverage reporting
- Add test:watch script for development workflow
- Install @vitest/ui for interactive test interface
- Install @vitest/coverage-v8 for code coverage

Usage:
  pnpm test:coverage  # Generate coverage report
  pnpm test:ui        # Open visual test interface
  pnpm test:watch     # Run tests in watch mode"

# Verify new commands work
pnpm test:coverage
# Expected: Coverage report generated

pnpm test:ui
# Expected: UI server starts (can close it)
```

### Verification Steps for Phase 1

```bash
# 1. Verify all files created
ls -la src/test-utils/
# Expected: factories.ts, render.tsx, mocks.ts, helpers.ts, index.ts

# 2. Verify configs updated
grep "test-utils" tsconfig.json vite.config.ts
# Expected: @/test-utils alias in both files

# 3. Run existing tests (should still pass)
pnpm test
# Expected output:
# ✓ All 144 tests passing
# ✓ No import errors
# ✓ Same duration (~2s)

# 4. Verify type checking works
pnpm type-check
# Expected: no errors

# 5. Verify new utilities can be imported
# Create temporary test file
cat > src/test-utils/__verify__.test.ts << 'EOF'
import { describe, it, expect } from "vitest";
import { 
  createMockTemporalFile, 
  createDormantFile,
  render 
} from "@/test-utils";

describe("Test Utils Verification", () => {
  it("should import factories", () => {
    const file = createMockTemporalFile();
    expect(file.key).toBeDefined();
  });
  
  it("should import presets", () => {
    const file = createDormantFile();
    expect(file.isDormant).toBe(true);
  });
});
EOF

pnpm vitest src/test-utils/__verify__.test.ts
# Expected: ✓ 2 tests passing

# Clean up verification test
rm src/test-utils/__verify__.test.ts

# 6. Verify coverage command works
pnpm test:coverage
# Expected: Coverage report generated in coverage/ directory

# 7. Verify UI command works (optional)
pnpm test:ui
# Expected: Browser opens with test UI (press Ctrl+C to stop)
```

### Phase 1 Git Completion Checkpoint

```bash
# === Review all Phase 1 commits ===
git log --oneline
# Expected to see ~7 commits:
# - refactor(test): initialize test-utils directory structure
# - refactor(test): add mock data factories for domain types
# - refactor(test): add custom render with provider support
# - refactor(test): add shared test mocks and helpers
# - refactor(test): add time and assertion test helpers
# - refactor(test): add test-utils main export
# - refactor(test): enhance setupTests with global mocks
# - refactor(test): configure test-utils path alias
# - chore(test): add coverage and UI test scripts

# === Verify clean state ===
git status
# Expected: nothing to commit, working tree clean

# === Tag Phase 1 completion ===
git tag -a phase-1-complete -m "Phase 1: Foundation complete

Summary:
- Created src/test-utils/ with factories, mocks, helpers
- Enhanced setupTests.ts with global mocks
- Added @/test-utils path alias to configs
- Added test:coverage and test:ui scripts
- All 144 tests still passing
- Zero breaking changes

Ready for Phase 2 migration"

# === Create checkpoint branch ===
git checkout -b checkpoint/phase-1-foundation
git checkout refactor/test-infrastructure

# === View tag ===
git show phase-1-complete

# === Push to remote (optional) ===
git push origin refactor/test-infrastructure
git push origin phase-1-complete
git push origin checkpoint/phase-1-foundation
```

### Phase 1 Success Criteria Checklist

Before proceeding to Phase 2, verify:

- [✓] All 7 utilities files created in `src/test-utils/`
- [✓] All Phase 1 commits follow conventional commit format
- [✓] `pnpm test` shows 144 tests passing
- [✓] `pnpm type-check` shows no errors
- [✓] `pnpm test:coverage` generates coverage report
- [✓] Can import from `@/test-utils` without errors
- [✓] `setupTests.ts` has global mocks for SVG/Canvas
- [✓] Git tag `phase-1-complete` created
- [✓] Checkpoint branch `checkpoint/phase-1-foundation` created
- [✓] No uncommitted changes: `git status` clean

**If ANY checkbox is unchecked, DO NOT proceed to Phase 2. Fix issues first.**

### Rollback Plan for Phase 1
```bash
# Delete new directory
rm -rf src/test-utils

# Revert config changes
git checkout tsconfig.json vite.config.ts package.json

# Tests should still pass
pnpm test
```

---

## Phase 2: Incremental Migration (One Test at a Time)
**Estimated Time:** 4-6 hours  
**Risk:** LOW  
**Rollback:** Each file migrated independently

### Git Workflow for Phase 2

```bash
# Ensure you're on the feature branch
git checkout refactor/test-infrastructure

# Verify Phase 1 tag exists
git tag -l
# Expected to see: phase-1-complete

# Each test file migration gets its own commit
# Pattern: migrate → test → commit
```

### Objectives
- Migrate one test file at a time
- Validate no behavior changes
- Establish migration pattern
- Document improvements

### Migration Order (Low Risk → High Risk)

#### Priority 1: Simple Unit Tests (START HERE)
1. ✅ `src/services/data/__tests__/DatasetRegistry.test.ts` - No mocks needed
2. ✅ `src/plugins/core/__tests__/PluginRegistry.test.ts` - Simple plugin mocks
3. ✅ `src/plugins/treemap-explorer/utils/__tests__/colorScales.coupling.test.ts` - Pure functions

#### Priority 2: Component Tests with Mock Data
4. ✅ `src/plugins/treemap-explorer/components/__tests__/TimeView.test.tsx` - Uses mock files (GOOD CANDIDATE)
5. ✅ `src/plugins/treemap-explorer/components/__tests__/CouplingView.test.tsx` - Similar pattern
6. ✅ `src/plugins/treemap-explorer/components/__tests__/TimelineScrubber.test.tsx` - UI component

#### Priority 3: Data Processing Tests
7. ✅ `src/services/data/__tests__/TemporalDataProcessor.test.ts` - Uses temporal data
8. ✅ `src/services/data/__tests__/CouplingDataProcessor.test.ts` - Uses network data

#### Priority 4: State Management
9. ✅ `src/store/__tests__/appStore.pluginState.test.ts` - Complex state

#### Priority 5: Complex Rendering
10. ✅ `src/plugins/treemap-explorer/renderers/__tests__/CouplingArcRenderer.test.ts` - SVG rendering

#### Priority 6: Integration Test (HIGHEST RISK)
11. ✅ `src/plugins/treemap-explorer/__tests__/TreemapExplorer.TimeLens.integration.test.ts` - Full plugin

### Migration Pattern (Step-by-Step)

**Example: Migrating TimeView.test.tsx**

#### Before (Current State)
```typescript
// src/plugins/treemap-explorer/components/__tests__/TimeView.test.tsx
import { render, screen } from "@testing-library/react";

const mockActiveFile: TemporalFileData = {
  key: "src/components/Button.tsx",
  name: "Button.tsx",
  // ... 20+ lines
};

const mockDormantFile: TemporalFileData = {
  key: "src/legacy/OldUtils.ts",
  // ... 20+ lines  
};

describe("TimeView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17"));
  });

  it("should render active status", () => {
    render(<TimeView file={mockActiveFile} />);
    // ...
  });
});
```

#### After (Migrated)
```typescript
// src/plugins/treemap-explorer/components/__tests__/TimeView.test.tsx
import { render, screen } from "@/test-utils"; // ← Changed import
import { 
  createMockTemporalFile, 
  createDormantFile,
  testDates 
} from "@/test-utils"; // ← Use factories

describe("TimeView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(testDates.reference); // ← Use helper
  });

  it("should render active status", () => {
    const activeFile = createMockTemporalFile(); // ← Factory
    render(<TimeView file={activeFile} />);
    // ... same assertions
  });

  it("should render dormant status", () => {
    const dormantFile = createDormantFile(); // ← Preset
    render(<TimeView file={dormantFile} />);
    // ...
  });

  it("should handle custom overrides", () => {
    const customFile = createMockTemporalFile({
      dormantDays: 365, // ← Easy override
      isDormant: true,
    });
    render(<TimeView file={customFile} />);
    // ...
  });
});
```

### Per-File Migration Checklist

For EACH test file, follow this workflow:

```markdown
## Migrating: [filename]

### Pre-Migration
- [ ] **BACKUP**: `cp [filename] [filename].backup`
- [ ] **ANALYZE**: Identify duplicated mock data patterns
- [ ] **PLAN**: List which factories/helpers to use

### Migration
- [ ] **IMPORT**: Add `import { ... } from "@/test-utils"`
- [ ] **REPLACE**: Swap inline mocks with factories
- [ ] **SIMPLIFY**: Remove now-unnecessary beforeEach/afterEach
- [ ] **VERIFY SYNTAX**: Check for TypeScript errors in IDE

### Testing
- [ ] **RUN FILE**: `pnpm vitest [filename] --run`
- [ ] **ASSERT**: All tests in file passing (same count)
- [ ] **RUN SUITE**: `pnpm test`
- [ ] **ASSERT**: All 144 tests still passing

### Git Commit
- [ ] **STAGE**: `git add [filename]`
- [ ] **COMMIT**: Use conventional format (see below)
- [ ] **VERIFY**: `git show HEAD` looks correct
- [ ] **DELETE BACKUP**: `rm [filename].backup`

### Measurements
- **Before:** [X] lines
- **After:** [Y] lines  
- **Reduction:** [Z]% = ((X-Y)/X * 100)
- **Tests:** [N] passing ✅
- **Commit hash:** [abc123]

## Git Commit Message Template

```bash
refactor(test): migrate [component/feature] tests to test-utils

- Replace inline mock[Type]Data with create[Type] factory
- Use [preset] for [common scenario]
- Remove duplicated [X] mock setup
- Reduce test code by [Z]%

Before: [X] lines
After: [Y] lines
Tests: [N] passing ✅
```

## Example Commit Messages

```bash
# For TimeView.test.tsx
refactor(test): migrate TimeView tests to test-utils

- Replace inline mockActiveFile with createMockTemporalFile()
- Replace inline mockDormantFile with createDormantFile()
- Use testDates.reference for consistent time mocking
- Remove duplicated 40-line mock data setup
- Reduce test code by 35%

Before: 215 lines
After: 140 lines
Tests: 19 passing ✅

# For DatasetRegistry.test.ts
refactor(test): migrate DatasetRegistry tests to test-utils

- Use render from @/test-utils for future-proofing
- No mock data changes (pure unit test)
- Update import path only

Before: 45 lines
After: 45 lines
Tests: 5 passing ✅
```

### Safety Script for Migration

Create a helper script to validate each migration:

**File:** `scripts/validate-test-migration.sh`
```bash
#!/bin/bash
# Usage: ./scripts/validate-test-migration.sh src/path/to/test.ts

TEST_FILE=$1

echo "Validating migration: $TEST_FILE"

# 1. Run just this test file
pnpm vitest run $TEST_FILE

# 2. Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed - REVERT CHANGES"
  exit 1
fi

# 3. Run full suite
pnpm test

if [ $? -eq 0 ]; then
  echo "✅ Full suite passed"
else
  echo "❌ Full suite failed - CHECK FOR SIDE EFFECTS"
  exit 1
fi

echo "✅ Migration validated successfully"
```

---

### Phase 2 Git Completion Checkpoint

```bash
# === Review all Phase 2 migration commits ===
git log --oneline phase-1-complete..HEAD
# Expected to see ~11 migration commits, one per test file

# === Verify all migrations ===
git diff --stat phase-1-complete
# Should show changes to 11 test files

# === Verify clean state ===
git status
# Expected: nothing to commit, working tree clean

# === Run full test suite ===
pnpm test
# Expected: ✓ 144 tests passing (same count, different implementation)

# === Calculate total line reduction ===
# Use git diff to measure impact
git diff phase-1-complete --stat | tail -1
# Example: "11 files changed, 1023 insertions(+), 2156 deletions(-)"
# Reduction: ~52% of test code

# === Tag Phase 2 completion ===
git tag -a phase-2-complete -m "Phase 2: Migration complete

Summary:
- Migrated 11 test files to use test-utils
- Eliminated ~2000 lines of duplicated mock data
- Reduced test code by ~50%
- All 144 tests still passing
- Zero breaking changes

Migrations:
1. DatasetRegistry.test.ts
2. PluginRegistry.test.ts
3. colorScales.coupling.test.ts
4. TimeView.test.tsx
5. CouplingView.test.tsx
6. TimelineScrubber.test.tsx
7. TemporalDataProcessor.test.ts
8. CouplingDataProcessor.test.ts
9. appStore.pluginState.test.ts
10. CouplingArcRenderer.test.ts
11. TreemapExplorer.TimeLens.integration.test.ts

Ready for Phase 3 (optional advanced patterns)"

# === Create checkpoint branch ===
git checkout -b checkpoint/phase-2-migration
git checkout refactor/test-infrastructure

# === View tag ===
git show phase-2-complete

# === Compare phases ===
git diff phase-1-complete phase-2-complete --stat

# === Push to remote (optional) ===
git push origin refactor/test-infrastructure
git push origin phase-2-complete
git push origin checkpoint/phase-2-migration
```

### Phase 2 Success Criteria Checklist

Before proceeding to Phase 3 (or merging to main), verify:

- [✓] All 11 test files migrated to use test-utils
- [✓] Each migration has its own descriptive commit
- [✓] All commits follow conventional commit format
- [✓] `pnpm test` shows 144 tests passing
- [✓] `pnpm type-check` shows no errors
- [✓] No inline mock data duplication remains
- [✓] Test code reduced by 40-60%
- [✓] Git tag `phase-2-complete` created
- [✓] Checkpoint branch `checkpoint/phase-2-migration` created
- [✓] No uncommitted changes: `git status` clean
- [✓] All backup files deleted

**If Phase 3 is skipped, this is the state to merge to main.**

---

## Phase 3: Advanced Patterns (Optional)
**Estimated Time:** 2-3 hours  
**Risk:** MEDIUM  
**Prerequisites:** Phase 1 & 2 complete

### Git Workflow for Phase 3

```bash
# Ensure you're on the feature branch
git checkout refactor/test-infrastructure

# Verify Phase 2 tag exists
git tag -l
# Expected to see: phase-1-complete, phase-2-complete

# Each advanced feature gets its own commit
```

### Objectives
- Add missing test types
- Create custom matchers
- Improve test performance

### 3.1: Add Custom Matchers

**File:** `src/test-utils/matchers.ts`

```typescript
import { expect } from "vitest";
import type { TemporalFileData } from "@/services/data/TemporalDataProcessor";

/**
 * Custom matcher: Check if file is dormant
 * Usage: expect(file).toBeDormant()
 */
export const toBeDormant = (file: TemporalFileData) => {
  const isDormant = file.isDormant && file.dormantDays > 180;
  return {
    pass: isDormant,
    message: () =>
      isDormant
        ? `Expected file NOT to be dormant, but dormantDays=${file.dormantDays}`
        : `Expected file to be dormant (>180 days), but dormantDays=${file.dormantDays}`,
  };
};

/**
 * Custom matcher: Check if file is active
 * Usage: expect(file).toBeActive()
 */
export const toBeActive = (file: TemporalFileData) => {
  const isActive = !file.isDormant && file.dormantDays < 90;
  return {
    pass: isActive,
    message: () =>
      isActive
        ? `Expected file NOT to be active`
        : `Expected file to be active (dormant <90 days)`,
  };
};

// Extend Vitest matchers
declare module "vitest" {
  interface Assertion<T = any> {
    toBeDormant(): T;
    toBeActive(): T;
  }
}

// Register matchers
expect.extend({
  toBeDormant,
  toBeActive,
});
```

**Add to setupTests.ts:**
```typescript
import "@/test-utils/matchers";
```

**Commit Checkpoint:**
```bash
# After creating matchers.ts
git add src/test-utils/matchers.ts
git commit -m "test: add custom matchers for file state assertions

- Add toBeDormant() matcher for dormant file validation
- Add toBeActive() matcher for active file validation
- Extend Vitest assertion interface with TypeScript
- Auto-register matchers in setupTests.ts

Usage:
  expect(file).toBeDormant()
  expect(file).toBeActive()"

# After updating setupTests.ts
git add src/setupTests.ts
git commit -m "refactor(test): register custom matchers in setup

- Import custom matchers for global availability
- Makes toBeDormant() and toBeActive() available in all tests"

pnpm test  # Verify: ✓ 144 tests passing
```

### 3.2: Test Performance Optimization

**File:** `vitest.config.ts` (if separate from vite.config.ts)

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    
    // Performance optimizations
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    
    // Separate slow tests
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["src/**/__tests__/**/*.integration.test.{ts,tsx}"],
    
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/setupTests.ts",
        "src/test-utils/",
        "**/*.test.{ts,tsx}",
        "**/__tests__/",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

**Commit Checkpoint:**
```bash
git add vitest.config.ts
git commit -m "chore(test): optimize test performance with thread pool

- Enable multi-threaded test execution (1-4 threads)
- Exclude integration tests from unit test runs
- Configure v8 coverage provider
- Set coverage thresholds at 70% baseline
- Add HTML coverage reporter

Performance improvements:
- Parallel test execution
- Faster feedback loop
- Separate slow integration tests"

pnpm test  # Verify: ✓ 144 tests passing (potentially faster)
```

### 3.3: Add Integration Test Suite

**File:** `vitest.integration.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ["src/**/__tests__/**/*.integration.test.{ts,tsx}"],
    poolOptions: {
      threads: {
        singleThread: true, // Integration tests run sequentially
      },
    },
  },
});
```

**Add scripts:**
```json
{
  "scripts": {
    "test:unit": "vitest -c vitest.config.ts",
    "test:integration": "vitest -c vitest.integration.config.ts",
    "test:all": "pnpm test:unit && pnpm test:integration"
  }
}
```

**Commit Checkpoints:**
```bash
# After creating vitest.integration.config.ts
git add vitest.integration.config.ts
git commit -m "chore(test): add separate integration test configuration

- Create dedicated config for integration tests
- Run integration tests sequentially (single thread)
- Include only *.integration.test.{ts,tsx} files
- Extend base vitest config

Rationale:
- Integration tests are slower and should run separately
- Sequential execution prevents race conditions
- Clear separation between unit and integration tests"

# After updating package.json
git add package.json
git commit -m "chore(test): add unit and integration test scripts

- Add test:unit script for fast unit test runs
- Add test:integration script for slower integration tests
- Add test:all script to run complete suite

Usage:
  pnpm test:unit         # Quick feedback (~1s)
  pnpm test:integration  # Full integration suite (~3s)
  pnpm test:all          # Complete test suite"

# Verify scripts work
pnpm test:unit
pnpm test:integration
pnpm test:all
```

### Phase 3 Git Completion Checkpoint

```bash
# === Review all Phase 3 commits ===
git log --oneline phase-2-complete..HEAD
# Expected to see ~5-6 commits for advanced features

# === Verify clean state ===
git status
# Expected: nothing to commit, working tree clean

# === Run all test variations ===
pnpm test              # All tests
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:coverage     # With coverage
# All should pass

# === Tag Phase 3 completion ===
git tag -a phase-3-complete -m "Phase 3: Advanced patterns complete

Summary:
- Added custom toBeDormant/toBeActive matchers
- Optimized test performance with thread pool
- Separated integration test suite
- Added test:unit and test:integration scripts
- All 144 tests still passing

Improvements:
- Test execution ~30% faster
- Better test organization
- Enhanced test assertions
- Comprehensive coverage reporting

Ready for merge to main"

# === Create checkpoint branch ===
git checkout -b checkpoint/phase-3-advanced
git checkout refactor/test-infrastructure

# === View tag ===
git show phase-3-complete

# === Compare all phases ===
git diff phase-1-complete phase-3-complete --stat

# === Push to remote (optional) ===
git push origin refactor/test-infrastructure
git push origin phase-3-complete
git push origin checkpoint/phase-3-advanced
```

### Phase 3 Success Criteria Checklist

- [✓] Custom matchers created and registered
- [✓] Test performance optimization configured
- [✓] Integration tests separated
- [✓] All test script variants work
- [✓] All commits follow conventional commit format
- [✓] `pnpm test:all` shows 144 tests passing
- [✓] `pnpm test:coverage` generates report with >70% threshold
- [✓] Git tag `phase-3-complete` created
- [✓] Checkpoint branch `checkpoint/phase-3-advanced` created
- [✓] No uncommitted changes: `git status` clean

**Phase 3 is complete. Ready to merge to main.**

---

## Success Metrics

### Quantitative Goals
- [ ] All 144 tests passing after each phase
- [ ] 50% reduction in test code lines
- [ ] <2s total test duration maintained
- [ ] 80%+ code coverage enabled
- [ ] Zero new TypeScript errors

### Qualitative Goals
- [ ] New tests take <5 min to write
- [ ] Mock data changes in 1 place
- [ ] Test failures are obvious
- [ ] New team members onboard faster

---

## Troubleshooting Guide

### Issue: Tests fail after adding test-utils

**Symptoms:**
```
Error: Cannot find module '@/test-utils'
```

**Solution:**
```bash
# Verify tsconfig.json paths section
# Verify vite.config.ts alias section
# Restart TypeScript server in IDE
```

### Issue: Mock data types don't match

**Symptoms:**
```
Type 'MockData' is not assignable to type 'RealData'
```

**Solution:**
```typescript
// In factories.ts, import REAL types
import { TemporalFileData } from "@/services/data/TemporalDataProcessor";

// Not mock types
// Don't create parallel type definitions
```

### Issue: Fake timers break after migration

**Symptoms:**
```
Tests timeout or dates are wrong
```

**Solution:**
```typescript
// Each test file must still manage its own timers
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(testDates.reference);
});

afterEach(() => {
  vi.useRealTimers();
});
```

### Issue: SVG tests fail with "getBBox is not a function"

**Symptoms:**
```
TypeError: element.getBBox is not a function
```

**Solution:**
```typescript
// Ensure setupTests.ts is loaded
// Check vite.config.ts has: setupFiles: './src/setupTests.ts'
```

### Issue: Tests slower after migration

**Symptoms:**
```
Duration increased from 1.9s to 3.5s
```

**Solution:**
```typescript
// Don't call factories in describe blocks
// ❌ Bad
describe("Tests", () => {
  const file = createMockTemporalFile(); // Runs before every test
});

// ✅ Good  
describe("Tests", () => {
  it("test", () => {
    const file = createMockTemporalFile(); // Runs only when needed
  });
});
```

---

## Reference Material for Next Session

### Key Files to Have Open
1. `src/setupTests.ts` - Current baseline
2. `src/plugins/treemap-explorer/components/__tests__/TimeView.test.tsx` - Example with mock data
3. `src/plugins/treemap-explorer/__tests__/TreemapExplorer.TimeLens.integration.test.ts` - Complex integration
4. `tsconfig.json` - Path aliases
5. `vite.config.ts` - Build config

### Type Definitions to Reference
```typescript
// Core domain types
import { TemporalFileData } from "@/services/data/TemporalDataProcessor";
import { TreemapExplorerState } from "@/plugins/treemap-explorer/types";
import { FileData } from "@/types/domain";

// Test library types
import { RenderOptions } from "@testing-library/react";
import { Mock } from "vitest";
```

### Commands to Run Frequently
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm vitest src/path/to/test.ts

# Watch mode for development
pnpm test:watch

# Coverage report
pnpm test:coverage

# Type checking
pnpm type-check

# Full validation
pnpm type-check && pnpm test
```

---

## Decision Log

### Why Co-locate Tests?
**Decision:** Keep `__tests__` folders next to source code  
**Reasoning:**
- Already established pattern (11 test files)
- Easier to find related tests
- Less refactoring needed
- Industry standard for component tests

### Why Factory Pattern?
**Decision:** Use factory functions, not classes  
**Reasoning:**
- Simpler API: `createMockX()`
- TypeScript-friendly with overrides
- No inheritance complexity
- Easier to extend

### Why Not Jest?
**Decision:** Keep Vitest  
**Reasoning:**
- Already configured and working
- Faster than Jest
- Better Vite integration
- Same API as Jest (easy migration later if needed)

### Why Incremental Migration?
**Decision:** Migrate one file at a time  
**Reasoning:**
- Zero risk of breaking everything
- Easy to rollback individual files
- Learn patterns with low stakes
- Maintain working test suite throughout

---

## Post-Refactor Maintenance

### Monthly Tasks
- [ ] Review test factories for unused code
- [ ] Update factories when types change
- [ ] Check test duration (should stay <3s)
- [ ] Review coverage reports

### When Adding New Features
- [ ] Create factory in `test-utils/factories.ts` if new domain type
- [ ] Add test in appropriate `__tests__/` folder
- [ ] Use factories instead of inline mocks
- [ ] Maintain >70% coverage

### When Onboarding New Developers
Share this checklist:
```markdown
## Testing Quick Start

1. **Writing a test:**
   ```typescript
   import { render, createMockTemporalFile } from "@/test-utils";
   
   it("test name", () => {
     const file = createMockTemporalFile({ dormantDays: 100 });
     render(<MyComponent file={file} />);
     expect(screen.getByText("100 days")).toBeInTheDocument();
   });
   ```

2. **Run tests:**
   ```bash
   pnpm test           # All tests
   pnpm test:watch     # Watch mode
   pnpm test:coverage  # With coverage
   ```

3. **Available factories:**
   - `createMockTemporalFile()` - File data
   - `createDormantFile()` - Old files
   - `createMockFileIndex()` - File index dataset
   - `createMockTemporalData()` - Time series data
   - `createMockTreemapState()` - Plugin state

4. **Test location:**
   - Co-locate: `src/components/MyComponent.tsx` → `src/components/__tests__/MyComponent.test.tsx`
```

---

## Appendix: Complete File Listing

### New Files Created (Phase 1)
```
src/test-utils/
├── index.ts              # 10 lines - Main export
├── factories.ts          # 150 lines - Mock data factories
├── render.tsx           # 25 lines - Custom render
├── mocks.ts             # 40 lines - Shared mocks
├── helpers.ts           # 30 lines - Test helpers
└── matchers.ts          # 40 lines - Custom matchers (Phase 3)

Total: ~295 lines of reusable code
Replaces: ~2000+ lines of duplicated mocks across tests
```

### Modified Files (Phase 1)
```
src/setupTests.ts        # 20 → 120 lines (100 added)
tsconfig.json            # 1 line added to paths
vite.config.ts           # 1 line added to alias
package.json             # 4 scripts added, 2 deps added
```

### Files to Migrate (Phase 2)
```
11 test files × ~10 min each = 110 min = ~2 hours
```

---

## Final Checklist Before Starting

### Pre-Session Setup
- [ ] Read entire plan document
- [ ] Have project open in IDE
- [ ] Ensure clean git state: `git status` shows no uncommitted changes
- [ ] On main branch: `git checkout main`
- [ ] Pull latest: `git pull origin main`
- [ ] Run baseline tests: `pnpm test` (verify 144 passing)
- [ ] Create feature branch: `git checkout -b refactor/test-infrastructure`
- [ ] Verify branch: `git branch` shows `* refactor/test-infrastructure`
- [ ] Have this plan document open for reference

### During Phase 1
- [ ] Create each file one by one
- [ ] Run tests after each file creation: `pnpm test`
- [ ] Commit after each major step (use provided messages)
- [ ] Verify imports work: `import { ... } from '@/test-utils'`
- [ ] Keep git history clean: one logical change per commit
- [ ] Push regularly (optional): `git push origin refactor/test-infrastructure`

### After Phase 1 Complete
- [ ] All 144 tests passing ✅
- [ ] Can import from `@/test-utils` ✅
- [ ] Coverage command works: `pnpm test:coverage` ✅
- [ ] Created git tag: `git tag -l` shows `phase-1-complete` ✅
- [ ] Created checkpoint branch: `git branch -l` shows `checkpoint/phase-1-foundation` ✅
- [ ] Clean state: `git status` shows nothing to commit ✅
- [ ] Ready for Phase 2 migration ✅

### During Phase 2
- [ ] Migrate one test file at a time
- [ ] Follow per-file checklist religiously
- [ ] Create backup before each migration
- [ ] Commit after each successful file migration
- [ ] Delete backup after commit
- [ ] Track line count reductions

### After Phase 2 Complete
- [ ] All 11 test files migrated ✅
- [ ] All 144 tests passing ✅
- [ ] 11 migration commits in git log ✅
- [ ] Created git tag: `phase-2-complete` ✅
- [ ] Created checkpoint branch: `checkpoint/phase-2-migration` ✅
- [ ] Test code reduced by 40-60% ✅

### Optional Phase 3
- [ ] Custom matchers added
- [ ] Performance optimization configured
- [ ] Integration tests separated
- [ ] Created git tag: `phase-3-complete` ✅
- [ ] Created checkpoint branch: `checkpoint/phase-3-advanced` ✅

### Before Merging to Main
- [ ] Review complete commit history: `git log --oneline`
- [ ] All tests passing: `pnpm test:all`
- [ ] Type checking clean: `pnpm type-check`
- [ ] Build successful: `pnpm build`
- [ ] Coverage meets threshold: `pnpm test:coverage`
- [ ] Follow pre-merge checklist in plan
- [ ] Create pull request with proper description

---

## Git Workflow Summary

### Quick Reference: Where Am I?

```bash
# Check current branch
git branch
# Should show: * refactor/test-infrastructure

# Check which phase you're in
git tag -l
# No tags = Not started
# phase-1-complete = Finished Phase 1
# phase-2-complete = Finished Phase 2
# phase-3-complete = Finished Phase 3

# See all commits in this refactor
git log --oneline main..HEAD

# See what's changed
git diff main --stat

# Check for uncommitted work
git status
```

### Visualization of Git History

```
main
  │
  └─── refactor/test-infrastructure
         │
         ├─ (7 commits) → [phase-1-complete] → checkpoint/phase-1-foundation
         │                                     │
         ├─ (11 commits) → [phase-2-complete] → checkpoint/phase-2-migration
         │                                      │
         └─ (5 commits) → [phase-3-complete] → checkpoint/phase-3-advanced
                                                │
                                                └─→ MERGE to main
```

### Expected Git Log After Each Phase

**After Phase 1:**
```bash
$ git log --oneline main..HEAD

abc1234 chore(test): add coverage and UI test scripts
def5678 refactor(test): configure test-utils path alias
ghi9012 refactor(test): enhance setupTests with global mocks
jkl3456 refactor(test): add test-utils main export
mno7890 refactor(test): add time and assertion test helpers
pqr1234 refactor(test): add shared test mocks and helpers
stu5678 refactor(test): add custom render with provider support
vwx9012 refactor(test): add mock data factories for domain types
```

**After Phase 2 (11 more commits):**
```bash
$ git log --oneline phase-1-complete..HEAD

abc1234 refactor(test): migrate TreemapExplorer integration tests to test-utils
def5678 refactor(test): migrate CouplingArcRenderer tests to test-utils
ghi9012 refactor(test): migrate appStore.pluginState tests to test-utils
jkl3456 refactor(test): migrate CouplingDataProcessor tests to test-utils
mno7890 refactor(test): migrate TemporalDataProcessor tests to test-utils
pqr1234 refactor(test): migrate TimelineScrubber tests to test-utils
stu5678 refactor(test): migrate CouplingView tests to test-utils
vwx9012 refactor(test): migrate TimeView tests to test-utils
yza2345 refactor(test): migrate colorScales.coupling tests to test-utils
bcd6789 refactor(test): migrate PluginRegistry tests to test-utils
efg0123 refactor(test): migrate DatasetRegistry tests to test-utils
```

**After Phase 3 (5 more commits):**
```bash
$ git log --oneline phase-2-complete..HEAD

abc1234 chore(test): add unit and integration test scripts
def5678 chore(test): add separate integration test configuration
ghi9012 chore(test): optimize test performance with thread pool
jkl3456 refactor(test): register custom matchers in setup
mno7890 test: add custom matchers for file state assertions
```

### Total Commit Count by Phase

- **Phase 1:** ~8 commits (foundation setup)
- **Phase 2:** ~11 commits (one per test file)
- **Phase 3:** ~5 commits (advanced features)
- **Total:** ~24 atomic commits

Each commit is:
- ✅ Independently revertable
- ✅ Passes all tests
- ✅ Has descriptive message
- ✅ Follows conventional commits

---

## Questions to Answer in Next Session

1. Should we migrate all 11 test files or prioritize specific ones?
2. Do we want to add E2E tests with Playwright/Cypress?
3. Should we set up CI/CD test automation?
4. Do we need snapshot testing for components?
5. Should we add accessibility testing (jest-axe)?

---

## Contact & Support

### Starting a New Session

When you start the next session, provide this context:

1. **This plan document** (TESTING_REFACTOR_PLAN.md)

2. **Current git status:**
```bash
git branch  # Which branch?
git tag -l  # Which phase complete?
git status  # Any uncommitted work?
git log --oneline main..HEAD | wc -l  # How many commits?
```

3. **Current test output:**
```bash
pnpm test
# Copy the summary line
```

4. **Where you are in the plan:**
- [ ] Not started → Begin with Phase 1
- [ ] Phase 1 complete → Begin Phase 2
- [ ] Phase 2 complete → Begin Phase 3 or merge
- [ ] Phase 3 complete → Prepare for merge
- [ ] Stuck on specific file → Need troubleshooting

5. **Any specific concerns or questions**

### Example Session Start Message

```
I'm implementing the testing refactor from TESTING_REFACTOR_PLAN.md.

Git Status:
- Branch: refactor/test-infrastructure
- Phase: phase-1-complete tag exists
- Commits: 8 commits ahead of main
- Status: clean (nothing to commit)

Test Status:
- Tests: ✓ 144 tests passing
- Duration: 1.91s
- Type checking: ✓ passing

Next Step: Start Phase 2 migration with DatasetRegistry.test.ts

Ready to proceed!
```

### If Something Goes Wrong

Provide:
1. Error message (full output)
2. Which step you were on
3. Current git status
4. Last successful commit hash
5. Test output before the error

**Remember:** 
- We have checkpoint branches for easy rollback
- Every commit should pass tests
- Take it slow, test frequently, commit often
- The plan is designed to be safe and incremental 🚀
