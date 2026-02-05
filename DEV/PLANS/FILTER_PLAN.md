# 🏗️ ROBUST SOLUTION: State Management Architecture for Plugin Filters

## Problem Analysis

**Root Cause:** The plugin state system doesn't distinguish between:

1. **Processing State** - Affects data aggregation (expensive, needs reprocessing)
2. **Rendering State** - Affects visual display only (cheap, just re-render)

**Current Bug:** `excludedDirectories` is processing state but treated as rendering state, causing filters to have no effect.

---

## Design Principles

1. **Plugin Autonomy** - Each plugin declares which state affects processing vs rendering
2. **Performance** - Minimize expensive reprocessing, allow cheap re-rendering
3. **Type Safety** - Leverage TypeScript to prevent future bugs
4. **Maintainability** - Clear contracts, easy to understand
5. **Extensibility** - Works for all current and future plugins

---

## PHASE 1: Plugin State Metadata System

### Goal

Give plugins a way to declare which state fields trigger reprocessing.

### Changes Required

#### 1.1: Extend Plugin Interface (`src/types/plugin.ts`)

```typescript
export interface VisualizationPlugin
  TConfig = any,
  TData = any,
  TState extends Record<string, unknown> = Record<string, unknown>
> {
  // ... existing methods ...

  /**
   * NEW: Declares which state fields affect data processing
   * If undefined, all state changes trigger reprocessing (safe default)
   * If empty array, no state changes trigger reprocessing (render-only)
   * If specified, only listed fields trigger reprocessing
   */
  processingStateKeys?: (keyof TState)[];

  /**
   * NEW: Optional method to validate state changes
   * Useful for debugging and development
   */
  validateState?: (state: TState) => string[]; // Returns errors
}
```

#### 1.2: Update TimelineHeatmapPlugin

```typescript
export class TimelineHeatmapPlugin implements VisualizationPlugin
  HeatmapConfig,
  HeatmapData,
  TimelineHeatmapState
> {
  // ... existing code ...

  /**
   * Declare that these state fields require data reprocessing
   * Other fields (if added later) only trigger re-render
   */
  processingStateKeys: (keyof TimelineHeatmapState)[] = [
    'excludedDirectories',
    'directoryCount',
  ];
  // NOTE: 'timeBin' affects processing but is handled separately via filters.timeBin
  // NOTE: 'metric' is fixed to 'commits', so not needed

  /**
   * Optional: Validate state for debugging
   */
  validateState = (state: TimelineHeatmapState): string[] => {
    const errors: string[] = [];

    if (state.directoryCount < 5 || state.directoryCount > 100) {
      errors.push('directoryCount must be between 5 and 100');
    }

    if (!Array.isArray(state.excludedDirectories)) {
      errors.push('excludedDirectories must be an array');
    }

    return errors;
  };
}
```

---

## PHASE 2: Smart State Change Detection

### Goal

Create a memoized selector that only changes when processing-affecting state changes.

### Changes Required

#### 2.1: Add Processing State Selector (`src/App.tsx`)

```typescript
// Add this after currentPluginState definition (around line 67)

/**
 * Memoized selector for state fields that affect data processing
 * Only changes when processing-relevant state changes, preventing
 * unnecessary expensive reprocessing on render-only state changes
 */
const processingRelevantState = useMemo(() => {
  if (!activePlugin || !activePlugin.processingStateKeys) {
    // If plugin doesn't declare keys, use entire state (safe default)
    return currentPluginState;
  }

  if (activePlugin.processingStateKeys.length === 0) {
    // Plugin declares no processing state (render-only)
    return null;
  }

  // Extract only processing-relevant keys
  const relevantState: Record<string, unknown> = {};
  activePlugin.processingStateKeys.forEach((key) => {
    relevantState[key as string] = currentPluginState[key as string];
  });

  return relevantState;
}, [activePlugin, currentPluginState]);

/**
 * Optional: Validate state changes in development
 */
useEffect(() => {
  if (process.env.NODE_ENV === "development" && activePlugin?.validateState) {
    const errors = activePlugin.validateState(currentPluginState as any);
    if (errors.length > 0) {
      console.warn(
        `[${activePlugin.metadata.id}] State validation errors:`,
        errors,
      );
    }
  }
}, [activePlugin, currentPluginState]);
```

#### 2.2: Update processData Effect Dependencies

```typescript
// Line 327 - Update dependency array
}, [
  activePlugin,
  pluginDataInput,
  processingRelevantState, // ← NEW: Only changes when processing state changes
  setError
]);
```

---

## PHASE 3: Deep Equality for Complex State

### Goal

Prevent reprocessing when state objects change reference but not content.

### Why Needed

```typescript
// These are different objects but semantically identical:
const state1 = { excludedDirectories: ["src/locales"] };
const state2 = { excludedDirectories: ["src/locales"] };
// state1 !== state2 (different references)
```

Current code would reprocess unnecessarily when filters panel reopens/closes.

### Changes Required

#### 3.1: Add Deep Equality Utility

```typescript
// src/utils/deepEqual.ts (NEW FILE)

/**
 * Deep equality check for plain objects and arrays
 * Used to prevent unnecessary reprocessing when state objects
 * change reference but not content
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, idx) => deepEqual(item, b[idx]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => deepEqual(a[key], b[key]));
}

/**
 * Hook for deep equality memoization
 * Only updates when value changes semantically, not by reference
 */
export function useDeepMemo<T>(value: T): T {
  const ref = useRef<T>(value);

  if (!deepEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}
```

#### 3.2: Use Deep Memoization

```typescript
// In src/App.tsx, wrap processingRelevantState

const processingRelevantState = useMemo(() => {
  // ... existing extraction logic ...
}, [activePlugin, currentPluginState]);

// Add deep equality check
const stableProcessingState = useDeepMemo(processingRelevantState);

// Then use stableProcessingState in dependency array
}, [
  activePlugin,
  pluginDataInput,
  stableProcessingState, // ← Uses deep equality
  setError
]);
```

---

## PHASE 4: Plugin-Side Incremental Filtering (Optional Enhancement)

### Goal

Allow plugins to filter pre-processed data instead of always reprocessing.

### When Beneficial

- Large datasets where filtering is faster than reprocessing
- Filters that don't affect aggregation logic
- Interactive filtering scenarios

### Changes Required

#### 4.1: Add Filter Method to Plugin Interface

```typescript
export interface VisualizationPlugin {
  // ... existing methods ...

  /**
   * Optional: Apply filters to already-processed data
   * If present, will be called instead of full reprocessing when
   * only filtering state changes
   *
   * @returns Filtered data or null if full reprocessing needed
   */
  applyFilters?: (
    processedData: TData,
    previousState: TState,
    newState: TState,
  ) => TData | null;
}
```

#### 4.2: Implement in TimelineHeatmap (Example)

```typescript
export class TimelineHeatmapPlugin {
  /**
   * Incremental filter application
   * Can handle exclusions without full reprocessing if directoryCount unchanged
   */
  applyFilters = (
    data: HeatmapData,
    prevState: TimelineHeatmapState,
    newState: TimelineHeatmapState,
  ): HeatmapData | null => {
    // If directoryCount changed, need full reprocess
    if (prevState.directoryCount !== newState.directoryCount) {
      return null; // Signal: need full reprocessing
    }

    // If only exclusions changed, we can filter in-place
    if (prevState.excludedDirectories !== newState.excludedDirectories) {
      const excluded = new Set(newState.excludedDirectories);

      return {
        ...data,
        directories: data.directories.filter((dir) => !excluded.has(dir)),
        cells: data.cells.filter(
          (row, idx) => !excluded.has(data.directories[idx]),
        ),
      };
    }

    return data; // No changes
  };
}
```

#### 4.3: Use in App.tsx

```typescript
// In processData effect, check for incremental filtering first
const processData = async () => {
  // Check if we can use incremental filtering
  if (
    processedPluginData &&
    activePlugin.applyFilters &&
    previousStateRef.current
  ) {
    const filtered = activePlugin.applyFilters(
      processedPluginData,
      previousStateRef.current,
      currentPluginState,
    );

    if (filtered) {
      console.log("[App] Applied incremental filter");
      setProcessedPluginData(filtered);
      previousStateRef.current = currentPluginState;
      return; // Skip full reprocessing
    }
  }

  // Fall back to full reprocessing
  // ... existing processData logic ...
};
```

---

## PHASE 5: Testing & Documentation

### 5.1: Add Tests

```typescript
// src/__tests__/pluginStateManagement.test.ts

describe("Plugin State Management", () => {
  it("should reprocess when processing state changes", async () => {
    // Test that excludedDirectories change triggers reprocessing
  });

  it("should NOT reprocess when render-only state changes", async () => {
    // Test that hypothetical UI state doesn't trigger reprocessing
  });

  it("should use deep equality for state comparison", () => {
    // Test that identical arrays with different references don't reprocess
  });

  it("should use incremental filtering when available", async () => {
    // Test applyFilters is called instead of full reprocessing
  });
});
```

### 5.2: Update Documentation

````markdown
# Plugin State Management Guide

## Processing State vs Rendering State

When creating a plugin, distinguish between two types of state:

### Processing State

State that affects data aggregation/computation. Changes trigger expensive reprocessing.

Example: `excludedDirectories`, `topN`, `aggregationMethod`

### Rendering State

State that only affects visual display. Changes trigger cheap re-render.

Example: `selectedCell`, `highlightedAuthor`, `showTooltips`

## Declaring Processing State

```typescript
export class MyPlugin implements VisualizationPlugin<Config, Data, State> {
  processingStateKeys: (keyof State)[] = ["excludedDirectories", "topN"];
  // Any state NOT listed here only triggers re-render, not reprocessing
}
```
````

## Performance Optimization

For advanced use cases, implement incremental filtering:

```typescript
applyFilters = (data, prevState, newState) => {
  // Return filtered data if possible, null to force full reprocess
};
```

````

---

## Implementation Checklist

### Phase 1: Foundation (Session 1)
- [ ] Add `processingStateKeys` to plugin interface
- [ ] Add `validateState` to plugin interface
- [ ] Update TimelineHeatmapPlugin with metadata
- [ ] Update TreemapExplorerPlugin with metadata

### Phase 2: Core Fix (Session 1)
- [ ] Add `processingRelevantState` memoized selector
- [ ] Add validation effect (dev mode only)
- [ ] Update processData dependency array
- [ ] Test with Timeline Heatmap filtering

### Phase 3: Deep Equality (Session 2)
- [ ] Create `deepEqual` utility
- [ ] Create `useDeepMemo` hook
- [ ] Integrate into App.tsx
- [ ] Add tests for deep equality

### Phase 4: Incremental Filtering (Session 3 - Optional)
- [ ] Add `applyFilters` interface method
- [ ] Implement in TimelineHeatmapPlugin
- [ ] Integrate into App.tsx processData logic
- [ ] Add performance benchmarks

### Phase 5: Polish (Session 4)
- [ ] Add comprehensive tests
- [ ] Write documentation
- [ ] Add TypeScript strict checks
- [ ] Performance profiling

---

## Benefits

✅ **Fixes the bug** - Filters will work correctly
✅ **Performance** - Only reprocesses when necessary
✅ **Type Safe** - Compile-time checks prevent future bugs
✅ **Maintainable** - Clear contracts, easy to extend
✅ **Plugin Agnostic** - Works for all plugins
✅ **Future Proof** - Supports incremental filtering optimization

---

## Alternative: Quick Fix

If you need a working solution NOW before implementing the full plan:

```typescript
// Line 327 in App.tsx - Just add currentPluginState back
}, [activePlugin, pluginDataInput, currentPluginState, setError]);
````

**Trade-off:** Will reprocess on ALL state changes (even UI-only), but filtering will work.

---

**Recommendation:** Implement Phases 1-2 first (core fix with metadata), then optimize with Phases 3-4 later if performance becomes an issue.

What do you think? Want to proceed with this plan?
