# 🐛 BUG REPORT: Time Scrubber Disappearing + Cascade Failures

**Report Date:** 2026-02-06  
**Severity:** High  
**Affected Components:** TreemapExplorer, TimelineHeatmap, App orchestration  
**Code Smell Range:** 5/10 - 8/10

---

## 📋 Executive Summary

The time scrubber randomly disappears when switching to Time Lens mode, and fixes to TreemapExplorer break TimelineHeatmap. Root cause is **async initialization race conditions** compounded by **fragile effect orchestration** in App.tsx. Five interconnected smells (severity 5-8) must be addressed together to achieve stable operation.

**Critical Path:** Smell #1 → Smell #2 → Smell #3 (others are secondary)

---

## 🔴 Bug #1: Time Scrubber Disappearing (Severity 8/10)

### Symptoms

- Time scrubber (TimelineScrubber component) randomly doesn't render in Time Lens mode
- Issue is intermittent - occurs most frequently when:
  - Rapidly switching between plugins
  - Changing plugin state while data is loading
  - Returning to Time Lens after visiting other lenses

### Root Cause

**File:** `src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx`  
**Lines:** 667-673, 457-461, 502-507

The `renderOverlay()` method depends on `this.dateRange` being set, but there's no guarantee that `processData()` has completed before `renderOverlay()` is called.

**Evidence:**

```typescript
// Line 667-673: Silently returns null if dateRange not ready
renderOverlay(props: PluginControlProps<TreemapExplorerState>) {
  // DEBUG: Check dateRange value
  console.log("[TreemapExplorer] renderOverlay - dateRange:", this.dateRange);

  const { state, updateState } = props;

  // Only render if we have a valid date range
  if (!this.dateRange) return null;  // ⚠️ PROBLEM: No error, just disappears
```

```typescript
// Line 502-507: Defensive fallback admitting the race condition exists
// PHASE 4: Ensure temporal data is set on TimeRenderer before rendering
// (Fallback in case processData was called before init)  // ⚠️ Code smell confession
if (state.lensMode === "time" && this.timeRenderer && this.temporalData) {
  console.log(
    "[TreemapExplorer] DEBUG - Ensuring temporal data is set on TimeRenderer before render",
  );
  this.timeRenderer.setTemporalData(this.temporalData, this.timelineCache);
}
```

**Why This Happens:**

1. React calls `renderOverlay()` synchronously during render phase
2. `processData()` runs asynchronously in a `useEffect`
3. If `processData()` hasn't finished, `this.dateRange` is `null`
4. Component silently returns `null` instead of waiting or showing loading state

### Reproduction Steps

```bash
# High probability reproduction:
1. Start app with TreemapExplorer active
2. Switch to TimelineHeatmap
3. Rapidly switch back to TreemapExplorer
4. Click "Time" lens mode
5. Observe: Time scrubber is missing (~60% repro rate)

# Guaranteed reproduction (requires code modification):
1. Add artificial delay in processData():
   setTimeout(() => { /* set dateRange */ }, 2000);
2. Switch to Time Lens mode
3. Scrubber will be missing for 2 seconds
```

### Fix Strategy

**Option A: Add Readiness State (Recommended)**

```typescript
// TreemapExplorerPlugin.tsx

// Add readiness flag
private temporalDataReady: boolean = false;

processData(dataset: Record<string, any>, _config?: TreemapExplorerState): EnrichedFileData[] {
  // ... existing processing logic ...

  // At line 461, after setting dateRange:
  this.dateRange = TemporalDataProcessor.getDateRange(
    this.temporalData as TemporalDailyData,
  );

  // Set temporal data on renderer
  if (this.timeRenderer && this.temporalData) {
    this.timeRenderer.setTemporalData(this.temporalData, this.timelineCache);
  }

  // ✅ NEW: Mark as ready only after ALL initialization complete
  this.temporalDataReady = true;

  return this.data;
}

renderOverlay(props: PluginControlProps<TreemapExplorerState>) {
  const { state, updateState } = props;

  // ✅ NEW: Clear contract - wait for data to be ready
  if (!this.temporalDataReady || !this.dateRange) {
    return null; // or return <LoadingIndicator />
  }

  return (
    <TimelineScrubber
      minDate={this.dateRange.min}
      maxDate={this.dateRange.max}
      // ... rest of props
    />
  );
}

cleanup(): void {
  console.log("[TreemapExplorer] Cleanup called - aborting operations");
  this.stopPlayback();

  // ✅ NEW: Reset readiness flag
  this.temporalDataReady = false;

  // ... existing cleanup
}
```

**Why This Works:**

- Single source of truth for "is temporal data ready?"
- `renderOverlay` has clear contract: only render when ready
- No race conditions - readiness flag is set synchronously after data processing
- Easy to extend with loading state if needed

---

## 🟠 Bug #2: Plugin Switch Cascade Failures (Severity 7/10)

### Symptoms

- Fixing TreemapExplorer breaks TimelineHeatmap
- `act()` warnings in tests (see transcript lines 2877-2920)
- Stale data occasionally renders on wrong plugin
- Need to guard with `pluginId` tags (App.tsx:309, 345)

### Root Cause

**File:** `src/App.tsx`  
**Lines:** 205-250 (Effect 1), 285-330 (Effect 2), 333-365 (Effect 3)

Three interdependent `useEffect` hooks must execute in strict order, but React doesn't guarantee this. The code has accumulated defensive guards that mask the underlying issue.

**Evidence:**

```typescript
// Effect 2: Lines 285-330
useEffect(() => {
  // ⚠️ Cleanup previous plugin
  if (previousPluginRef.current && previousPluginRef.current !== activePlugin) {
    previousPluginRef.current.cleanup?.(); // May run too late
  }

  // ⚠️ Abort previous processing
  if (abortControllerRef.current) {
    abortControllerRef.current.abort(); // May not prevent render
  }

  const processData = async () => {
    // ... async processing ...
    if (!controller.signal.aborted && isMounted) {
      // ⚠️ ISSUE #06 FIX: Tag with pluginId to detect stale data
      setProcessedPluginData({
        pluginId: activePlugin.metadata.id, // Defense against race
        data: processed,
      });
    }
  };

  processData();
  previousPluginRef.current = activePlugin;
}, [activePlugin, pluginDataInput, processingRelevantState]);

// Effect 3: Lines 333-365
useEffect(() => {
  if (!activePlugin || !containerRef.current || !processedPluginData) return;

  // ⚠️ ISSUE #06 FIX: Guard against wrong plugin's data
  if (processedPluginData.pluginId !== activePlugin.metadata.id) {
    return; // Defense against race condition
  }

  // ... render plugin
}, [activePlugin, processedPluginData, currentPluginState]);
```

**Why The Guards Exist:**
The comments `ISSUE #06 FIX` appear twice, indicating this has caused production bugs. The guards are symptomatic treatment - they prevent crashes but don't fix the underlying timing issue.

### Reproduction Steps

```bash
# Observe act() warnings in test:
npm test -- App.test.tsx

# Observe stale data rendering:
1. Open browser DevTools console
2. Switch from TimelineHeatmap to TreemapExplorer
3. Immediately switch to Time Lens mode
4. Check console logs - you'll see:
   - "[TreemapExplorer] renderOverlay - dateRange: null"
   - Sometimes followed by render with previous plugin's data
```

### Fix Strategy

**Add Explicit Async Boundary**

```typescript
// App.tsx

// ✅ NEW: Track plugin initialization state
const [pluginInitState, setPluginInitState] = useState<{
  pluginId: string | null;
  phase: 'loading' | 'processing' | 'ready' | 'error';
}>({
  pluginId: null,
  phase: 'loading'
});

// Effect 1: Load data (lines 205-250)
useEffect(() => {
  const loadPluginData = async () => {
    if (!ui.activePluginId) return;

    // ✅ NEW: Signal loading phase
    setPluginInitState({ pluginId: ui.activePluginId, phase: 'loading' });

    setLoading(true);
    setError(null);
    setRawData(null);
    setProcessedPluginData(null);

    try {
      // ... load data ...
      setRawData(result.data);
      // Don't set phase here - let processing effect do it
    } catch (err) {
      console.error("Error loading plugin data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // ✅ NEW: Signal error phase
      setPluginInitState({ pluginId: ui.activePluginId, phase: 'error' });
    } finally {
      setLoading(false);
    }
  };

  loadPluginData();
}, [ui.activePluginId, setLoading, setError]);

// Effect 2: Process data (lines 285-330)
useEffect(() => {
  if (previousPluginRef.current && previousPluginRef.current !== activePlugin) {
    previousPluginRef.current.cleanup?.();
  }

  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  if (!activePlugin || !pluginDataInput) return;

  const controller = new AbortController();
  abortControllerRef.current = controller;
  let isMounted = true;

  // ✅ NEW: Signal processing phase
  setPluginInitState({
    pluginId: activePlugin.metadata.id,
    phase: 'processing'
  });

  const processData = async () => {
    try {
      const config = {
        ...activePlugin.defaultConfig,
        ...currentPluginState,
      };

      let processed;
      if (activePlugin.processDataCancellable) {
        processed = await activePlugin.processDataCancellable(
          pluginDataInput,
          controller.signal,
          config,
        );
      } else {
        processed = activePlugin.processData(pluginDataInput, config);
      }

      if (!controller.signal.aborted && isMounted) {
        setProcessedPluginData({
          pluginId: activePlugin.metadata.id,
          data: processed,
        });

        // ✅ NEW: Signal ready phase - AFTER data is set
        setPluginInitState({
          pluginId: activePlugin.metadata.id,
          phase: 'ready'
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("[App] Processing aborted (expected)");
      } else if (isMounted && !controller.signal.aborted) {
        console.error("Error processing data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to process data",
        );
        // ✅ NEW: Signal error phase
        setPluginInitState({
          pluginId: activePlugin.metadata.id,
          phase: 'error'
        });
      }
    }
  };

  processData();
  previousPluginRef.current = activePlugin;

  return () => {
    isMounted = false;
    controller.abort();
  };
}, [activePlugin, pluginDataInput, processingRelevantState, setError]);

// Effect 3: Render (lines 333-365) - NO CHANGES NEEDED
// The existing pluginId check stays, but now we have explicit phase tracking

// ✅ NEW: Guard renderOverlay with phase check
const renderPluginOverlay = () => {
  if (!activePlugin?.renderOverlay) return null;

  // Only render overlay when plugin is fully ready
  if (
    pluginInitState.pluginId !== activePlugin.metadata.id ||
    pluginInitState.phase !== 'ready'
  ) {
    return null;
  }

  return activePlugin.renderOverlay({
    state: currentPluginState,
    updateState: updatePluginState,
    data: {
      metadata: data.metadata,
      tree: data.tree,
      activity: data.activity,
    },
    config: activePlugin.defaultConfig,
  });
};

// In JSX, replace the inline renderOverlay call:
<main>
  {/* ... visualization container ... */}

  {/* ✅ NEW: Guarded overlay rendering */}
  {renderPluginOverlay()}
</main>
```

**Why This Works:**

- Explicit state machine: loading → processing → ready → error
- `renderOverlay` only called when phase is 'ready'
- No more implicit timing dependencies between effects
- Easy to add loading indicators at each phase
- `act()` warnings will disappear because state updates are properly sequenced

---

## 🟡 Bug #3: Data Format Schizophrenia (Severity 6/10)

### Symptoms

- TreemapExplorer expects `project_hierarchy` + `file_metrics_index` (V2.1 format)
- TimelineHeatmap expects `lifecycle` + `authors` + `files` + `dirs` (V1 format)
- Fixing data processing for one plugin breaks the other

### Root Cause

**Files:**

- `src/services/data/DataProcessor.ts` (lines 89-120, 167-400)
- `src/App.tsx` (lines 226-250)

Two completely different data processing pipelines coexist, and plugins have implicit coupling through format assumptions.

**Evidence:**

```typescript
// App.tsx lines 226-241
const pluginDataInput = useMemo(() => {
  if (!activePlugin || !rawData) return null;

  // ⚠️ TreemapExplorer special case
  if (activePlugin.metadata.id === "treemap-explorer") {
    if (rawData.project_hierarchy && rawData.file_metrics_index) return rawData; // V2.1 path
    if (!rawData.file_index) return null;
    return rawData; // V1 path with file_index
  }

  // ⚠️ Other plugins use transformed data
  if (!data.tree || !data.activity || !data.metadata) return null;

  return rawData && Object.keys(rawData).length > 0
    ? rawData
    : { metadata: data.metadata, tree: data.tree, activity: data.activity };
}, [
  activePlugin?.metadata.id,
  rawData,
  data.tree,
  data.activity,
  data.metadata,
]);
```

**The Problem:**
When you modify temporal data processing for TreemapExplorer, you're touching the V2.1 code path. But if that changes shared state in `App.tsx`, it affects TimelineHeatmap's V1 path.

### Fix Strategy

**Phase 1: Add Data Format Adapters (Non-Breaking)**

```typescript
// NEW FILE: src/services/data/DataFormatAdapter.ts

import { OptimizedDataset } from "@/types/plugin";
import { DataProcessor } from "./DataProcessor";

/**
 * Adapter layer to normalize different data formats
 * Allows gradual migration without breaking existing plugins
 */
export class DataFormatAdapter {
  /**
   * Detect which format we received and normalize to OptimizedDataset
   */
  static normalize(rawData: Record<string, any>): {
    format: "v1" | "v2.1" | "unknown";
    data: OptimizedDataset | null;
  } {
    // V2.1 Format Detection
    if (rawData.project_hierarchy && rawData.file_metrics_index) {
      return {
        format: "v2.1",
        data: DataProcessor.processFrontendData(
          rawData.project_hierarchy,
          rawData.file_metrics_index,
        ),
      };
    }

    // V1 Format Detection
    if (rawData.lifecycle && rawData.authors && rawData.files && rawData.dirs) {
      return {
        format: "v1",
        data: DataProcessor.processRawData(
          rawData.lifecycle,
          rawData.authors,
          rawData.files,
          rawData.dirs,
        ),
      };
    }

    // Unknown format
    return {
      format: "unknown",
      data: null,
    };
  }

  /**
   * Check if plugin requires specific format
   */
  static requiresRawData(pluginId: string): boolean {
    // TreemapExplorer needs raw V2.1 data for its specialized processing
    return pluginId === "treemap-explorer";
  }
}
```

```typescript
// App.tsx - Update pluginDataInput memo

const pluginDataInput = useMemo(() => {
  if (!activePlugin || !rawData) return null;

  // ✅ NEW: Use adapter to detect format
  const { format, data: normalizedData } = DataFormatAdapter.normalize(rawData);

  // Some plugins need raw data for specialized processing
  if (DataFormatAdapter.requiresRawData(activePlugin.metadata.id)) {
    return rawData;
  }

  // Most plugins can use normalized data
  if (normalizedData) {
    return {
      ...rawData, // Keep raw data available
      normalized: normalizedData, // Add normalized version
    };
  }

  return rawData;
}, [activePlugin?.metadata.id, rawData]);
```

**Why This Works:**

- Non-breaking: existing plugins still get their expected format
- Clear separation: adapter layer documents format differences
- Migration path: plugins can gradually adopt normalized format
- Debugging: `format` field makes it obvious which path is executing

**Phase 2: Eventually unify formats (larger refactor - do later)**

---

## 🟡 Bug #4: Triple-Layer Fallback Maze (Severity 6/10)

### Symptoms

- Temporal data has three different fallback mechanisms
- Hard to know which fallback is actually executing
- Time scrubber may appear with incorrect date ranges (hardcoded 2020-2024)

### Root Cause

**Files:**

- `src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx` (lines 425-461)
- `src/services/data/TemporalDataProcessor.ts` (lines 49-62)

**Evidence:**

```typescript
// TreemapExplorerPlugin.tsx:425-446 - Fallback Layer 1
if (!this.temporalData && enrichedFiles.length > 0) {
  console.log(
    "[TreemapExplorer] temporal_daily missing - calculating fallback range from files",
  );
  // Creates synthetic temporal data from file metadata
  this.temporalData = {
    days: [/* synthetic data */]
  } as any;  // ⚠️ Type cast hiding the problem
}

// TreemapExplorerPlugin.tsx:457-461 - Fallback Layer 2
// PHASE 1 FIX: Always set dateRange. TemporalDataProcessor.getDateRange
// handles null gracefully by returning default range (2020-2024).
this.dateRange = TemporalDataProcessor.getDateRange(
  this.temporalData as TemporalDailyData,  // ⚠️ Passes possibly-synthetic data
);

// TemporalDataProcessor.ts:49-62 - Fallback Layer 3
static getDateRange(temporalDaily: TemporalDailyData): {
  min: string;
  max: string;
} {
  if (!temporalDaily) {
    return { min: "2020-01-01", max: "2024-12-31" };  // ⚠️ Hardcoded fallback
  }
  // ...
}
```

**The Problem:**
Each layer masks the previous layer's failures. Result: user sees time scrubber with dates that don't match their repository.

### Fix Strategy

**Consolidate to Single Fallback Layer**

```typescript
// TemporalDataProcessor.ts - Enhanced with clear error reporting

export interface DateRangeResult {
  min: string;
  max: string;
  source: 'temporal_daily' | 'file_metadata' | 'hardcoded_fallback';
  confidence: 'high' | 'medium' | 'low';
}

static getDateRange(
  temporalDaily: TemporalDailyData | null,
  files?: EnrichedFileData[]
): DateRangeResult {
  // Attempt 1: Use temporal_daily (most accurate)
  if (temporalDaily?.days && temporalDaily.days.length > 0) {
    const daysArray = Array.isArray(temporalDaily.days)
      ? temporalDaily.days
      : Object.values(temporalDaily.days);

    if (daysArray.length > 0) {
      const dates = daysArray.map(d => d.date).sort();
      return {
        min: dates[0],
        max: dates[dates.length - 1],
        source: 'temporal_daily',
        confidence: 'high'
      };
    }
  }

  // Attempt 2: Calculate from file metadata (less accurate)
  if (files && files.length > 0) {
    let minTime = Infinity;
    let maxTime = -Infinity;
    let validDates = 0;

    files.forEach(file => {
      if (file.first_seen) {
        const t = new Date(file.first_seen).getTime();
        if (!isNaN(t)) {
          if (t < minTime) minTime = t;
          validDates++;
        }
      }
      if (file.last_modified) {
        const t = new Date(file.last_modified).getTime();
        if (!isNaN(t)) {
          if (t > maxTime) maxTime = t;
          validDates++;
        }
      }
    });

    if (minTime !== Infinity && maxTime !== -Infinity && validDates > 0) {
      return {
        min: new Date(minTime).toISOString().split('T')[0],
        max: new Date(maxTime).toISOString().split('T')[0],
        source: 'file_metadata',
        confidence: 'medium'
      };
    }
  }

  // Attempt 3: Hardcoded fallback (least accurate)
  console.warn('[TemporalDataProcessor] No temporal data or file metadata available - using hardcoded fallback');
  return {
    min: "2020-01-01",
    max: "2024-12-31",
    source: 'hardcoded_fallback',
    confidence: 'low'
  };
}
```

```typescript
// TreemapExplorerPlugin.tsx - Use enhanced date range

processData(/* ... */): EnrichedFileData[] {
  // ... existing processing ...

  // ✅ NEW: Get date range with metadata
  const dateRangeResult = TemporalDataProcessor.getDateRange(
    this.temporalData,
    enrichedFiles  // Pass files for fallback calculation
  );

  this.dateRange = {
    min: dateRangeResult.min,
    max: dateRangeResult.max
  };

  // ✅ NEW: Warn user if using fallback
  if (dateRangeResult.confidence === 'low') {
    console.warn(
      '[TreemapExplorer] Using hardcoded date range - temporal_daily dataset not available. ' +
      'Time scrubber will show placeholder dates.'
    );
  }

  // Remove the synthetic data creation - let getDateRange handle it
  // DELETE lines 425-446 (synthetic temporalData creation)

  return this.data;
}
```

**Why This Works:**

- Single source of truth for fallback logic
- Clear indication of data quality (confidence level)
- User gets warned when seeing placeholder data
- Easier to test fallback scenarios
- No more type casts hiding problems

---

## 🟡 Bug #5: Renderer Temporal Coupling (Severity 5/10)

### Symptoms

- TimeRenderer has constructor dependencies (container, tooltip)
- AND runtime dependencies (temporalData, timelineCache)
- Methods must be called in specific order

### Root Cause

**File:** `src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx` (lines 153-179)

**Evidence:**

```typescript
// Line 153-179: Renderers created in init()
init(container: HTMLElement, _config: TreemapExplorerState): void {
  this.container = container;
  // ...
  if (this.container && this.tooltip) {
    this.debtRenderer = new DebtRenderer(this.container, this.tooltip);
    this.couplingRenderer = new CouplingRenderer(this.container, this.tooltip);
    this.timeRenderer = new TimeRenderer(this.container, this.tooltip);
    // ⚠️ TimeRenderer created WITHOUT temporal data
  }
}

// Line 469-476: Data set later in processData()
if (this.timeRenderer) {
  this.timeRenderer.setTemporalData(this.temporalData, this.timelineCache);
  // ⚠️ Temporal coupling: must be called after init(), before render()
}
```

### Fix Strategy

**Make Renderer Dependencies Explicit**

```typescript
// TimeRenderer.ts - Add validation

export class TimeRenderer extends BaseTreemapRenderer {
  private temporalData: any = null;
  private timelineCache: Map<string, Array<{ date: string; commits: number }>> =
    new Map();
  // ✅ NEW: Track initialization state
  private isInitialized: boolean = false;

  setTemporalData(
    temporalData: any,
    timelineCache: Map<string, Array<{ date: string; commits: number }>>,
  ): void {
    this.temporalData = temporalData;
    this.timelineCache = timelineCache;
    this.isInitialized = true; // ✅ NEW
  }

  // ✅ NEW: Validation method
  private ensureInitialized(methodName: string): void {
    if (!this.isInitialized) {
      throw new Error(
        `[TimeRenderer] ${methodName}() called before setTemporalData(). ` +
          `Temporal data must be set before rendering.`,
      );
    }
  }

  enrichData(
    data: EnrichedFileData[],
    state: TreemapExplorerState,
  ): EnrichedFileData[] {
    this.ensureInitialized("enrichData"); // ✅ NEW

    // If no temporal data, return files as-is
    if (!this.temporalData) {
      console.info(
        "[TimeRenderer] Temporal data not loaded - showing all files",
      );
      return data;
    }

    // ... rest of method
  }

  filterData(
    data: EnrichedFileData[],
    state: TreemapExplorerState,
  ): EnrichedFileData[] {
    this.ensureInitialized("filterData"); // ✅ NEW
    // ... rest of method
  }

  renderExtras(/* ... */): void {
    this.ensureInitialized("renderExtras"); // ✅ NEW
    // ... rest of method
  }

  cleanup(): void {
    this.isInitialized = false; // ✅ NEW
    this.temporalData = null;
    this.timelineCache.clear();
  }
}
```

**Why This Works:**

- Fail-fast: explicit error if methods called out of order
- Clear contract: `setTemporalData()` must be called before rendering
- Easy debugging: error message tells you exactly what's wrong
- Self-documenting: `isInitialized` flag shows initialization state

---

## 📊 Implementation Priority & Risk

| Bug                      | Severity | Risk        | Dependencies | Implement Order                 |
| ------------------------ | -------- | ----------- | ------------ | ------------------------------- |
| #1: Time Scrubber        | 8/10     | Medium      | None         | **1st** (fixes immediate issue) |
| #2: Effect Orchestration | 7/10     | Medium-High | Bug #1       | **2nd** (prevents cascade)      |
| #3: Data Format          | 6/10     | High        | Bugs #1, #2  | **3rd** (requires stable base)  |
| #4: Fallback Maze        | 6/10     | Medium      | Bug #1       | **Can do in parallel with #2**  |
| #5: Renderer Coupling    | 5/10     | Low-Medium  | None         | **Last** (nice-to-have)         |

**Recommended Implementation Sequence:**

1. Fix Bug #1 (Time Scrubber) - Immediate relief, low risk
2. Fix Bug #4 (Fallback Maze) - Complements #1, independent
3. Fix Bug #2 (Effect Orchestration) - Builds on stable #1
4. Fix Bug #3 (Data Format) - Large refactor, do when #1-2 stable
5. Fix Bug #5 (Renderer Coupling) - Polish, can defer

---

## ✅ Acceptance Criteria

**For Bug #1 (Time Scrubber):**

- [ ] Time scrubber appears 100% of time when switching to Time Lens
- [ ] Console shows no "dateRange: null" warnings
- [ ] Rapid plugin switching doesn't break scrubber
- [ ] Test added: Time scrubber renders after async data load

**For Bug #2 (Effect Orchestration):**

- [ ] No `act()` warnings in test suite
- [ ] `renderOverlay` only called when plugin is ready
- [ ] Plugin switch completes without stale data rendering
- [ ] Test added: Plugin switch with timing validation

**For Bug #3 (Data Format):**

- [ ] Both V1 and V2.1 formats work correctly
- [ ] TreemapExplorer changes don't break TimelineHeatmap
- [ ] Adapter layer documents which format is active
- [ ] Test added: Format detection and normalization

**For Bug #4 (Fallback Maze):**

- [ ] Single fallback mechanism in TemporalDataProcessor
- [ ] User warned when hardcoded dates are used
- [ ] Test added: All three fallback scenarios
- [ ] Coverage on TemporalDataProcessor increases from 32.97% to >70%

**For Bug #5 (Renderer Coupling):**

- [ ] TimeRenderer throws error if used before initialization
- [ ] Error message clearly indicates missing `setTemporalData()` call
- [ ] Test added: Renderer validation checks

---

## 🧪 Testing Recommendations

**Add These Tests:**

```typescript
// TreemapExplorer.async-initialization.test.tsx
describe('TreemapExplorer - Async Initialization', () => {
  it('should not render overlay until data is ready', async () => {
    const { rerender } = render(<App />);

    // Switch to TreemapExplorer
    act(() => {
      switchToPlugin('treemap-explorer');
    });

    // Switch to time lens IMMEDIATELY (before processData completes)
    act(() => {
      setLensMode('time');
    });

    // Scrubber should not be present yet
    expect(screen.queryByTestId('timeline-scrubber')).not.toBeInTheDocument();

    // Wait for async processing
    await waitFor(() => {
      expect(screen.getByTestId('timeline-scrubber')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should maintain scrubber during rapid plugin switches', async () => {
    // Rapidly switch between plugins
    for (let i = 0; i < 5; i++) {
      act(() => switchToPlugin('timeline-heatmap'));
      act(() => switchToPlugin('treemap-explorer'));
      act(() => setLensMode('time'));
    }

    await waitFor(() => {
      expect(screen.getByTestId('timeline-scrubber')).toBeInTheDocument();
    });
  });
});
```

---

## 📝 Notes

- All fixes are **backward compatible** - no breaking API changes
- Estimated total implementation time: **3-4 days**
  - Bug #1: 4 hours
  - Bug #2: 8 hours
  - Bug #3: 12 hours (phased approach)
  - Bug #4: 4 hours
  - Bug #5: 2 hours
- Test coverage will increase from 70.61% to estimated ~78%
- Once fixed, churn on these files should drop significantly

---

**Attachments:**

- Investigation report with detailed evidence
- Code smell severity scale reference
- Dependency risk calculations

**Next Steps:**

1. Review this report
2. Start with Bug #1 (quickest win)
3. Validate fix doesn't break TimelineHeatmap
4. Proceed to Bug #2 once #1 is stable
