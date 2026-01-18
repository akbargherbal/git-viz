# Testing Guide
**Git-Viz Project Testing Reference**

This guide covers all testing patterns, utilities, and best practices for writing tests in the git-viz project.

---

## Quick Start

All test utilities are imported from a single location:

```typescript
import { 
  describe, it, expect,           // Vitest globals
  createActiveFile,               // Factory functions
  setupFakeTimers,                // Time helpers
  render, screen                  // React testing utilities
} from '@/test-utils';
```

---

## Available Test Utilities

### Factory Functions

#### Temporal File Data
```typescript
// Base factory with sensible defaults
createTemporalFile(overrides?)

// Presets for common scenarios
createActiveFile()      // Recently modified, actively maintained
createDormantFile()     // >180 days since last modification
createNewFile()         // Newly created (1 day old)
createMinimalFile()     // Edge case with minimal data
```

**Example:**
```typescript
const activeFile = createActiveFile({ 
  total_commits: 100,
  unique_authors: 8 
});

const customFile = createTemporalFile({
  key: "src/utils/helpers.ts",
  name: "helpers.ts",
  total_commits: 25
});
```

#### Enriched File Data (Pre-temporal)
```typescript
createEnrichedFile(overrides?)
createOldEnrichedFile()      // For temporal processing tests
createRecentEnrichedFile()   // Recently created
createActiveEnrichedFile()   // Frequently modified

// Batch creation
createEnrichedFileList(count?)  // Returns [old, recent, active, ...custom]
```

**Example:**
```typescript
const files = createEnrichedFileList(5);  // 5 files with varied characteristics
const oldFile = createOldEnrichedFile({ age_days: 700 });
```

#### Dataset Structures
```typescript
createTemporalData(overrides?)       // temporal_daily structure
createMockTemporalData(overrides?)   // Alternative temporal format
createCouplingData(overrides?)       // Coupling network edges
createMockFileIndex(overrides?)      // file_index dataset
```

**Example:**
```typescript
const temporalData = createTemporalData({
  date_range: { min: "2024-01-01", max: "2025-01-01" }
});

const couplingData = createCouplingData({
  edges: [
    { source: "A.ts", target: "B.ts", couplingStrength: 0.9 }
  ]
});
```

#### Plugin Mocks
```typescript
createMockPlugin(options?)              // Standard plugin
createLegacyPlugin(options?)            // Plugin without data requirements
createInvalidPlugin(options?)           // Plugin with missing datasets
createPluginWithOptionalMissing()       // Plugin with optional missing datasets
```

**Example:**
```typescript
const plugin = createMockPlugin({
  id: 'test-viz',
  name: 'Test Visualization',
  dataRequirements: [
    { dataset: 'temporal_monthly', required: true }
  ]
});

PluginRegistry.register(plugin);
expect(PluginRegistry.get('test-viz')).toBeDefined();
```

#### State Factories
```typescript
createMockTreemapState(overrides?)  // TreemapExplorer state
```

---

### Time Testing Helpers

```typescript
// Fake timers for deterministic date/time
setupFakeTimers(date?)      // Default: "2026-01-17"
cleanupFakeTimers()         // Restore real timers

// Async helpers
waitForNextTick()           // Wait for next event loop tick
delay(ms)                   // Promise-based delay

// Test date constant
TEST_DATE = "2026-01-17"
```

**Example:**
```typescript
describe('TimeView', () => {
  beforeEach(() => {
    setupFakeTimers();  // All tests use consistent date
  });

  afterEach(() => {
    cleanupFakeTimers();
  });

  it('should calculate dormant days correctly', () => {
    const file = createDormantFile();
    expect(file.isDormant).toBe(true);
  });
});
```

---

### DOM Testing Utilities

```typescript
// Container management
createMockContainer()       // Create DOM element for D3/Canvas tests
destroyMockContainer(el)    // Clean up after tests

// React rendering
render(component, options?)           // Standard RTL render
renderWithProviders(component, opts?) // With Zustand store providers
```

**Example:**
```typescript
describe('CouplingArcRenderer', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = createMockContainer();
  });

  afterEach(() => {
    destroyMockContainer(container);
  });

  it('should render arcs', () => {
    const svg = d3.select(container).append('svg');
    renderer.render(svg, data);
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});
```

---

### Vitest Globals

All standard Vitest functions are re-exported:

```typescript
describe, it, expect, vi
beforeEach, afterEach, beforeAll, afterAll
```

---

## Testing Patterns

### Pattern 1: Service Layer Tests
**Use case:** Testing data processors, registries, utilities

```typescript
import { describe, it, expect } from '@/test-utils';
import { 
  createEnrichedFileList, 
  createTemporalData 
} from '@/test-utils';
import { TemporalDataProcessor } from '../TemporalDataProcessor';

describe('TemporalDataProcessor', () => {
  const mockFiles = createEnrichedFileList(3);
  const mockTemporalData = createTemporalData();

  it('should enrich files with temporal data', () => {
    const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
      mockFiles,
      mockTemporalData,
      100
    );

    expect(enriched).toHaveLength(3);
    enriched.forEach(file => {
      expect(file).toHaveProperty('createdDate');
      expect(file).toHaveProperty('isDormant');
    });
  });
});
```

### Pattern 2: Component Tests
**Use case:** Testing React components with rendering

```typescript
import { describe, it, expect } from '@/test-utils';
import { render, screen, createActiveFile } from '@/test-utils';
import { TimeView } from '../TimeView';

describe('TimeView', () => {
  it('should render active file correctly', () => {
    const file = createActiveFile();
    render(<TimeView file={file} />);

    expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    expect(screen.queryByText('DORMANT')).not.toBeInTheDocument();
  });

  it('should show dormant badge for dormant files', () => {
    const file = createDormantFile();
    render(<TimeView file={file} />);

    expect(screen.getByText('DORMANT')).toBeInTheDocument();
  });
});
```

### Pattern 3: D3/Canvas Renderer Tests
**Use case:** Testing D3 visualizations, canvas operations

```typescript
import { 
  describe, it, expect, beforeEach, afterEach 
} from '@/test-utils';
import { 
  createMockContainer, 
  destroyMockContainer,
  createCouplingData 
} from '@/test-utils';
import { CouplingArcRenderer } from '../CouplingArcRenderer';
import * as d3 from 'd3';

describe('CouplingArcRenderer', () => {
  let container: HTMLElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

  beforeEach(() => {
    container = createMockContainer();
    svg = d3.select(container).append('svg');
  });

  afterEach(() => {
    destroyMockContainer(container);
  });

  it('should render coupling arcs', () => {
    const data = createCouplingData();
    const renderer = new CouplingArcRenderer(svg);
    
    renderer.render(data);
    
    const arcs = container.querySelectorAll('path.coupling-arc');
    expect(arcs.length).toBeGreaterThan(0);
  });
});
```

### Pattern 4: Plugin Tests
**Use case:** Testing plugin registration, validation, lifecycle

```typescript
import { describe, it, expect, beforeEach } from '@/test-utils';
import { 
  createMockPlugin, 
  createLegacyPlugin 
} from '@/test-utils';
import { PluginRegistry } from '../PluginRegistry';

describe('PluginRegistry', () => {
  beforeEach(() => {
    PluginRegistry.clear();
  });

  it('should validate plugin data requirements', async () => {
    const plugin = createMockPlugin();
    PluginRegistry.register(plugin);

    const validation = await PluginRegistry.validateDataAvailability(
      'mock-plugin'
    );

    expect(validation.valid).toBe(true);
    expect(validation.available).toContain('temporal_monthly');
  });

  it('should handle legacy plugins without requirements', () => {
    const plugin = createLegacyPlugin();
    PluginRegistry.register(plugin);

    const requirements = PluginRegistry.getDataRequirements('legacy-plugin');
    expect(requirements).toEqual([]);
  });
});
```

### Pattern 5: Integration Tests
**Use case:** Testing plugin initialization, full data pipelines

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  createMockFileIndex,
  createMockTemporalData,
  createMockTreemapState,
  createMockContainer,
  destroyMockContainer 
} from '@/test-utils';
import { TreemapExplorerPlugin } from '../TreemapExplorerPlugin';

describe('TreemapExplorer - Time Lens Integration', () => {
  let plugin: TreemapExplorerPlugin;
  let container: HTMLElement;

  beforeEach(() => {
    container = createMockContainer();
    plugin = new TreemapExplorerPlugin();
  });

  afterEach(() => {
    plugin.destroy();
    destroyMockContainer(container);
  });

  it('should process and render temporal data', async () => {
    const fileIndex = createMockFileIndex();
    const temporalData = createMockTemporalData();
    const state = createMockTreemapState({ lensMode: 'time' });

    await plugin.init(container, {});
    await plugin.processData({ 
      file_index: fileIndex, 
      temporal_daily: temporalData 
    });
    
    plugin.render(state);

    expect(container.querySelectorAll('.treemap-cell').length).toBeGreaterThan(0);
  });
});
```

---

## Best Practices

### ✅ DO

- **Import from `@/test-utils`** for all test utilities
- **Use factory presets** when they match your scenario (`createActiveFile()`)
- **Override specific fields** when you need custom values
- **Use `beforeEach/afterEach`** for setup and cleanup
- **Test one behavior per test** - keep tests focused
- **Use descriptive test names** - "should do X when Y"
- **Clean up resources** - destroy containers, restore timers

### ❌ DON'T

- **Don't create inline mocks** - use factories instead
- **Don't duplicate mock data** - reuse factories
- **Don't test implementation details** - test behavior
- **Don't forget cleanup** - memory leaks and flaky tests
- **Don't over-mock** - use real implementations when possible

---

## Common Scenarios

### Testing with Multiple Files
```typescript
const files = createEnrichedFileList(10);  // 10 varied files
const [oldFile, recentFile, activeFile] = files;
```

### Testing Edge Cases
```typescript
const minimalFile = createMinimalFile();  // Minimal required fields
const newFile = createNewFile({ age_days: 0 });  // Brand new
```

### Testing Time-Dependent Logic
```typescript
beforeEach(() => setupFakeTimers());
afterEach(() => cleanupFakeTimers());

it('should calculate age correctly', () => {
  // All dates are relative to TEST_DATE = "2026-01-17"
  const file = createDormantFile();
  expect(file.dormantDays).toBeGreaterThan(180);
});
```

### Testing D3 Visualizations
```typescript
let container: HTMLElement;
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

beforeEach(() => {
  container = createMockContainer();
  svg = d3.select(container).append('svg')
    .attr('width', 800)
    .attr('height', 600);
});

afterEach(() => destroyMockContainer(container));
```

### Testing with Custom State
```typescript
const state = createMockTreemapState({
  lensMode: 'coupling',
  sizeMetric: 'age',
  couplingThreshold: 0.5
});
```

---

## File Organization

```
src/
├── services/
│   └── data/
│       ├── DataProcessor.ts
│       └── __tests__/
│           └── DataProcessor.test.ts      # Co-located with source
├── plugins/
│   └── treemap-explorer/
│       ├── TreemapExplorerPlugin.tsx
│       ├── __tests__/
│       │   └── TreemapExplorer.integration.test.ts
│       └── components/
│           ├── TimeView.tsx
│           └── __tests__/
│               └── TimeView.test.tsx      # Next to component
└── test-utils/                            # Centralized utilities
    ├── index.ts                           # Main export
    ├── factories.ts                       # Mock data factories
    ├── mocks.ts                           # DOM/fetch mocks
    ├── helpers.ts                         # Time/async helpers
    └── render.tsx                         # React test utilities
```

**Convention:** Place tests in `__tests__/` directories next to the code they test.

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (development)
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test TimeView.test.tsx

# Run tests matching pattern
pnpm test --grep "TimeView"
```

---

## Debugging Tests

### View Test Output
```typescript
it('should process data', () => {
  const result = processor.process(data);
  console.log('Result:', result);  // Visible in test output
  expect(result).toBeDefined();
});
```

### Check DOM State
```typescript
import { screen } from '@/test-utils';

it('should render correctly', () => {
  render(<Component />);
  screen.debug();  // Prints current DOM tree
  expect(screen.getByText('Expected')).toBeInTheDocument();
});
```

### Inspect Factory Output
```typescript
const file = createActiveFile();
console.log(JSON.stringify(file, null, 2));  // See all fields
```

---

## E2E Testing

End-to-end testing is not yet implemented but is planned. For the complete E2E testing strategy, including tool selection (Playwright), architecture, and implementation roadmap, see:

📄 **[E2E Testing Strategy](./E2E_TESTING_STRATEGY.md)**

The E2E strategy is designed to:
- Reuse existing `test-utils` factories for fixture generation
- Complement (not duplicate) unit/integration tests
- Focus on 5-10 critical user journeys
- Integrate seamlessly with current testing infrastructure

---

## Summary Checklist

When writing a new test:

- [ ] Import from `@/test-utils`
- [ ] Use factory functions for mock data
- [ ] Set up and tear down resources properly
- [ ] Test behavior, not implementation
- [ ] Use descriptive test names
- [ ] Keep tests focused (one assertion per test when possible)
- [ ] Run tests before committing: `pnpm test`

**Remember:** Good tests are readable, maintainable, and catch real bugs. Use the factories, helpers, and patterns documented here to write consistent, high-quality tests across the codebase.
