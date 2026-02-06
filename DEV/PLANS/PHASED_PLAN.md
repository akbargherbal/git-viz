# Multi-Session Refactoring Plan: Time Scrubber & Cascade Failure Fixes

**Project:** git-viz
**Total Sessions:** 5-6 sessions
**Strategy:** Incremental, test-after-each-phase, feature-flag safe

---

## 📋 Quick Reference: Session Order

| Session | Bug(s) | Files Changed | Risk | Duration |
|---------|--------|---------------|------|----------|
| **1** | #1 | TreemapExplorerPlugin.tsx (1 file) | Low | 2-3 hrs |
| **2** | #4 | TemporalDataProcessor.ts (1 file) | Low-Medium | 2-3 hrs |
| **3** | #2 | App.tsx (1 file) | Medium | 3-4 hrs |
| **4** | #5 | TimeRenderer.ts, BaseTreemapRenderer.ts (2 files) | Low | 2 hrs |
| **5** | #3 | DataProcessor.ts, both plugins (3-4 files) | High | 4-5 hrs |
| **6** | Testing & Polish | Test files, integration (multiple) | Low | 2-3 hrs |

**Total Estimated Time:** 15-20 hours across 6 sessions

---

## 🎯 Session 1: Fix Bug #1 - Time Scrubber Readiness Flag

**Objective:** Ensure time scrubber always renders when Time Lens is active

**Why First:** 
- Immediate user-visible fix
- Low risk (single flag, isolated change)
- Establishes "readiness" pattern for later phases

### Changes Required

**File:** `src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx`

#### Step 1.1: Add Readiness Flag (5 min)
```typescript
// Line ~96 - Add after existing private fields
private temporalDataReady: boolean = false;
```

#### Step 1.2: Set Flag in processData() (10 min)
```typescript
// Line ~476 - After setting temporal data on renderer, add:
if (this.timeRenderer && this.temporalData) {
  console.log("[TreemapExplorer] Setting temporal data on TimeRenderer in processData");
  this.timeRenderer.setTemporalData(this.temporalData, this.timelineCache);
  
  // ✅ NEW: Mark temporal data as ready
  this.temporalDataReady = true;
  console.log("[TreemapExplorer] Temporal data marked as ready");
}
```

#### Step 1.3: Update renderOverlay() (10 min)
```typescript
// Line ~671 - Replace null check with readiness check
renderOverlay(props: PluginControlProps<TreemapExplorerState>) {
  const { state, updateState } = props;

  // ✅ NEW: Only render when temporal data is fully initialized
  if (!this.temporalDataReady || !this.dateRange) {
    console.log("[TreemapExplorer] renderOverlay - Not ready yet", {
      temporalDataReady: this.temporalDataReady,
      dateRange: !!this.dateRange
    });
    return null;
  }

  return (
    <TimelineScrubber
      minDate={this.dateRange.min}
      maxDate={this.dateRange.max}
      // ... rest of props
    />
  );
}
```

#### Step 1.4: Reset Flag in cleanup() (5 min)
```typescript
// Line ~109 - Add to cleanup method
cleanup(): void {
  console.log("[TreemapExplorer] Cleanup called - aborting operations");
  this.stopPlayback();
  
  // ✅ NEW: Reset readiness flag
  this.temporalDataReady = false;

  // ... existing cleanup code
}
```

### Testing Checklist

```bash
# 1. Run existing tests - should all pass
npm test -- TreemapExplorer

# 2. Manual testing (in browser)
# - Switch to TreemapExplorer
# - Click "Time" lens mode
# - Verify scrubber appears
# - Rapidly switch between plugins 5 times
# - Switch to Time Lens
# - Verify scrubber still appears

# 3. Check console logs
# Should see:
# - "Temporal data marked as ready"
# - No "dateRange: null" warnings
```

### Success Criteria
- [ ] Time scrubber appears 100% of time in Time Lens mode
- [ ] All existing tests pass
- [ ] No console errors during plugin switching
- [ ] Console logs confirm readiness flag is set

### Rollback Strategy
```bash
# If issues arise, revert single commit
git revert HEAD
```

---

## 🎯 Session 2: Fix Bug #4 - Centralize Fallback Logic

**Objective:** Single source of truth for temporal data fallbacks with user warnings

**Why Second:**
- Builds on Session 1's readiness flag
- Removes duplicate fallback logic
- Low risk (mostly consolidation, not behavior change)

### Changes Required

**File:** `src/services/data/TemporalDataProcessor.ts`

#### Step 2.1: Add Confidence Enum (10 min)
```typescript
// Add at top of file after imports
export enum DateRangeConfidence {
  HIGH = "high",        // From real temporal_daily data
  MEDIUM = "medium",    // Calculated from file metadata
  LOW = "low",          // Hardcoded fallback
}

export interface DateRangeResult {
  min: string;
  max: string;
  confidence: DateRangeConfidence;
  source: string;
}
```

#### Step 2.2: Refactor getDateRange() (30 min)
```typescript
static getDateRange(temporalDaily: TemporalDailyData): DateRangeResult {
  // Case 1: Real temporal data exists
  if (temporalDaily) {
    let daysArray: any[] = [];
    if (Array.isArray(temporalDaily.days)) {
      daysArray = temporalDaily.days;
    } else if (typeof temporalDaily.days === "object" && temporalDaily.days !== null) {
      daysArray = Object.values(temporalDaily.days);
    }

    if (daysArray.length > 0) {
      const dates = daysArray.map((d) => d.date).sort();
      console.log("[TemporalDataProcessor] Using real temporal data", {
        dateCount: dates.length,
        range: [dates[0], dates[dates.length - 1]]
      });
      return {
        min: dates[0],
        max: dates[dates.length - 1],
        confidence: DateRangeConfidence.HIGH,
        source: "temporal_daily dataset"
      };
    }
  }

  // Case 2: Fallback to hardcoded range
  console.warn(
    "[TemporalDataProcessor] ⚠️ FALLBACK: Using hardcoded date range. " +
    "temporal_daily dataset is missing or empty. Time lens will show full timeline."
  );
  
  return {
    min: "2020-01-01",
    max: "2024-12-31",
    confidence: DateRangeConfidence.LOW,
    source: "hardcoded fallback"
  };
}
```

#### Step 2.3: Add Calculated Fallback Method (30 min)
```typescript
/**
 * Calculate date range from file metadata (medium confidence)
 * Used when temporal_daily is missing but files have dates
 */
static calculateRangeFromFiles(
  files: Array<{ first_seen?: string; last_modified?: string }>
): DateRangeResult | null {
  let minTime = Infinity;
  let maxTime = -Infinity;
  let validDates = 0;

  files.forEach((file) => {
    if (file.first_seen) {
      const t = new Date(file.first_seen).getTime();
      if (!isNaN(t) && t < minTime) {
        minTime = t;
        validDates++;
      }
    }
    if (file.last_modified) {
      const t = new Date(file.last_modified).getTime();
      if (!isNaN(t) && t > maxTime) {
        maxTime = t;
        validDates++;
      }
    }
  });

  if (minTime === Infinity || maxTime === -Infinity || validDates < 2) {
    return null; // Not enough data
  }

  const minDate = new Date(minTime).toISOString().split("T")[0];
  const maxDate = new Date(maxTime).toISOString().split("T")[0];
  
  console.log("[TemporalDataProcessor] Calculated range from file metadata", {
    filesScanned: files.length,
    validDates,
    range: [minDate, maxDate]
  });

  return {
    min: minDate,
    max: maxDate,
    confidence: DateRangeConfidence.MEDIUM,
    source: "calculated from file metadata"
  };
}
```

#### Step 2.4: Update TreemapExplorerPlugin to Use New API (20 min)

**File:** `src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx`

```typescript
// Line ~457 - Replace fallback logic with centralized approach
this.temporalData = dataset.temporal_daily;

// Try to get range from temporal data first
let dateRangeResult = TemporalDataProcessor.getDateRange(
  this.temporalData as TemporalDailyData
);

// If low confidence and we have file metadata, try to calculate better range
if (
  dateRangeResult.confidence === DateRangeConfidence.LOW &&
  enrichedFiles.length > 0
) {
  const calculatedRange = TemporalDataProcessor.calculateRangeFromFiles(enrichedFiles);
  if (calculatedRange) {
    dateRangeResult = calculatedRange;
  }
}

// Store the date range (now always set)
this.dateRange = {
  min: dateRangeResult.min,
  max: dateRangeResult.max
};

// Log the confidence level
if (dateRangeResult.confidence !== DateRangeConfidence.HIGH) {
  console.warn(
    `[TreemapExplorer] Using ${dateRangeResult.confidence} confidence date range from ${dateRangeResult.source}`
  );
}

// DELETE lines 425-446 (synthetic temporal data creation - no longer needed)
```

### Testing Checklist

```bash
# 1. Run tests
npm test -- TemporalDataProcessor.test.ts
npm test -- TreemapExplorer

# 2. Test with real data
# - Switch to Time Lens
# - Check console for confidence level
# - Should see "Using real temporal data" or warning

# 3. Test fallback (requires removing temporal_daily from dataset)
# - Manually test with missing temporal_daily
# - Should see "FALLBACK" warning in console
# - Scrubber should still render with calculated or hardcoded range

# 4. Verify coverage increase
npm test:coverage
# TemporalDataProcessor should go from 32.97% to ~65%+
```

### Success Criteria
- [ ] Single `getDateRange()` method handles all cases
- [ ] Console warnings when using fallbacks
- [ ] Coverage on TemporalDataProcessor increases to >60%
- [ ] All existing tests pass
- [ ] Time scrubber still works in all scenarios

---

## 🎯 Session 3: Fix Bug #2 - Effect Orchestration with Async Boundaries

**Objective:** Explicit plugin initialization state machine to prevent race conditions

**Why Third:**
- Builds on Sessions 1 & 2's stable initialization
- Eliminates need for ISSUE #06 defensive guards
- Medium risk (touches core App.tsx logic)

### Changes Required

**File:** `src/App.tsx`

#### Step 3.1: Add Plugin Initialization State (15 min)
```typescript
// Line ~48 - Add new state after existing states
const [pluginInitState, setPluginInitState] = useState<{
  pluginId: string | null;
  phase: 'loading' | 'processing' | 'ready' | 'error';
  startTime: number;
}>({
  pluginId: null,
  phase: 'loading',
  startTime: Date.now()
});
```

#### Step 3.2: Update Effect 1 - Data Loading (20 min)
```typescript
// Line ~144 - Modify loadPluginData effect
useEffect(() => {
  const loadPluginData = async () => {
    if (!ui.activePluginId) return;

    const plugin = PluginRegistry.get(ui.activePluginId);
    if (!plugin) return;

    // ✅ NEW: Signal loading phase
    setPluginInitState({
      pluginId: ui.activePluginId,
      phase: 'loading',
      startTime: Date.now()
    });

    setLoading(true);
    setError(null);
    setRawData(null);
    setProcessedPluginData(null);

    try {
      setLoadingProgress({ loaded: 0, total: 1, phase: "metadata" });

      const requirements = PluginRegistry.getDataRequirements(ui.activePluginId);
      const result = await PluginDataLoader.loadForPlugin(requirements);

      if (!result.success) {
        throw new Error(`Failed to load data: ${result.errors.join(", ")}`);
      }

      setLoadingProgress({ loaded: 1, total: 1, phase: "complete" });
      setRawData(result.data);
      
      // ✅ NEW: Data loaded successfully, ready for processing
      // Don't set to 'processing' here - let next effect do it
      
    } catch (err) {
      console.error("Error loading plugin data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      
      // ✅ NEW: Signal error state
      setPluginInitState(prev => ({
        ...prev,
        phase: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  loadPluginData();
}, [ui.activePluginId, setLoading, setError]);
```

#### Step 3.3: Update Effect 2 - Data Processing (30 min)
```typescript
// Line ~285 - Modify processData effect
useEffect(() => {
  // Cleanup previous plugin
  if (previousPluginRef.current && previousPluginRef.current !== activePlugin) {
    previousPluginRef.current.cleanup?.();
  }

  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  if (!activePlugin || !pluginDataInput) return;

  // ✅ NEW: Signal processing phase start
  setPluginInitState(prev => ({
    pluginId: activePlugin.metadata.id,
    phase: 'processing',
    startTime: prev.pluginId === activePlugin.metadata.id ? prev.startTime : Date.now()
  }));

  const controller = new AbortController();
  abortControllerRef.current = controller;
  let isMounted = true;

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
        
        // ✅ NEW: Signal ready phase - data is processed and ready to render
        setPluginInitState({
          pluginId: activePlugin.metadata.id,
          phase: 'ready',
          startTime: Date.now()
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("[App] Processing aborted (expected)");
      } else if (isMounted && !controller.signal.aborted) {
        console.error("Error processing data:", error);
        setError(error instanceof Error ? error.message : "Failed to process data");
        
        // ✅ NEW: Signal error state
        setPluginInitState(prev => ({
          ...prev,
          phase: 'error'
        }));
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
```

#### Step 3.4: Update Effect 3 - Rendering (20 min)
```typescript
// Line ~338 - Modify render effect with explicit phase check
useEffect(() => {
  if (!activePlugin || !containerRef.current || !processedPluginData) return;

  // ✅ NEW: Wait for 'ready' phase before rendering
  if (pluginInitState.phase !== 'ready' || 
      pluginInitState.pluginId !== activePlugin.metadata.id) {
    console.log("[App] Waiting for plugin to be ready", {
      currentPhase: pluginInitState.phase,
      pluginMatch: pluginInitState.pluginId === activePlugin.metadata.id
    });
    return;
  }

  // ✅ OLD GUARD: Keep for backwards compatibility but should never trigger now
  if (processedPluginData.pluginId !== activePlugin.metadata.id) {
    console.warn("[App] Data mismatch - this shouldn't happen with new state machine");
    return;
  }

  try {
    const config = {
      ...activePlugin.defaultConfig,
      timeBin: filters.timeBin,
      metric: filters.metric,
      ...currentPluginState,
      onCellClick: (cell: any) => {
        setSelectedCell(cell);
      },
    };

    console.log(`[App] Rendering ${activePlugin.metadata.id} in phase: ${pluginInitState.phase}`);
    activePlugin.init(containerRef.current, config);
    activePlugin.render(processedPluginData.data, config);
    mainScroll.checkScrollability();
  } catch (error) {
    console.error("Error rendering visualization:", error);
    setError(
      error instanceof Error ? error.message : "Failed to render visualization",
    );
  }
}, [
  activePlugin,
  processedPluginData,
  pluginInitState, // ✅ NEW: Add to dependencies
  currentPluginState,
  filters.timeBin,
  filters.metric,
  setSelectedCell,
  setError,
]);
```

#### Step 3.5: Add Debug Info to UI (10 min)
```typescript
// Line ~455 - Add to app container data attributes
<div
  className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden"
  data-testid="app-container"
  data-active-plugin={ui.activePluginId || "none"}
  data-plugin-data-ready={isDataReady}
  data-plugin-init-phase={pluginInitState.phase}  // ✅ NEW
  data-plugin-init-id={pluginInitState.pluginId}  // ✅ NEW
>
```

### Testing Checklist

```bash
# 1. Run tests - expect act() warnings to disappear
npm test -- App.test.tsx

# 2. Manual browser testing
# - Open DevTools console
# - Switch between plugins 10 times rapidly
# - Look for:
#   - "Waiting for plugin to be ready" logs
#   - No "Data mismatch" warnings
#   - Smooth phase transitions: loading → processing → ready

# 3. Check data attributes in browser
# - Inspect app-container element
# - Verify data-plugin-init-phase transitions correctly

# 4. Test with slow network
# - Throttle network in DevTools
# - Switch plugins during loading
# - Verify clean cancellation and state transitions
```

### Success Criteria
- [ ] No act() warnings in tests
- [ ] Console shows clear phase transitions
- [ ] Plugin rendering only happens in 'ready' phase
- [ ] Rapid plugin switching doesn't cause crashes
- [ ] Old ISSUE #06 guards never trigger (can log if they do)

### Rollback Strategy
```bash
# Revert the commit if rendering breaks
git revert HEAD

# Or keep old guards active as fallback:
# Don't delete the pluginId checks, just log when they trigger
```

---

## 🎯 Session 4: Fix Bug #5 - Renderer Initialization Validation

**Objective:** Fail-fast validation for renderer initialization order

**Why Fourth:**
- Now that initialization is stable (Sessions 1-3), we can add strict validation
- Low risk (adds validation, doesn't change behavior)
- Nice-to-have polish

### Changes Required

#### File 1: `src/plugins/treemap-explorer/renderers/TimeRenderer.ts`

**Step 4.1: Add Initialization Tracking (15 min)**
```typescript
// Line ~19 - Add after existing fields
export class TimeRenderer extends BaseTreemapRenderer {
  private temporalData: any = null;
  private timelineCache: Map<string, Array<{ date: string; commits: number }>> = new Map();
  
  // ✅ NEW: Track initialization state
  private isInitialized: boolean = false;

  /**
   * Set temporal data and timeline cache for enrichment
   */
  setTemporalData(
    temporalData: any,
    timelineCache: Map<string, Array<{ date: string; commits: number }>>,
  ): void {
    this.temporalData = temporalData;
    this.timelineCache = timelineCache;
    this.isInitialized = true; // ✅ NEW
    
    console.log("[TimeRenderer] Temporal data set - renderer initialized");
  }
```

**Step 4.2: Add Validation Method (10 min)**
```typescript
  /**
   * ✅ NEW: Validate that temporal data has been set before rendering
   */
  private ensureInitialized(methodName: string): void {
    if (!this.isInitialized) {
      const error = new Error(
        `[TimeRenderer] ${methodName}() called before setTemporalData(). ` +
        `Temporal data must be set via setTemporalData() before rendering methods can be called. ` +
        `Check that TreemapExplorerPlugin.processData() completed successfully.`
      );
      console.error(error.message);
      throw error;
    }
  }
```

**Step 4.3: Add Validation to Methods (20 min)**
```typescript
  /**
   * TIME-SPECIFIC: Enrich files with temporal context
   */
  enrichData(
    data: EnrichedFileData[],
    state: TreemapExplorerState,
  ): EnrichedFileData[] {
    this.ensureInitialized("enrichData"); // ✅ NEW
    
    // If no temporal data, return files as-is
    if (!this.temporalData) {
      console.info("[TimeRenderer] Temporal data not loaded - showing all files");
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

  renderExtras(
    _svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _cells: d3.HierarchyRectangularNode<any>[],
    _state: TreemapExplorerState,
  ): void {
    this.ensureInitialized("renderExtras"); // ✅ NEW
    // No overlays needed for time lens
  }
```

**Step 4.4: Reset in Cleanup (5 min)**
```typescript
  /**
   * ✅ UPDATED: Reset initialization state
   */
  cleanup(): void {
    this.isInitialized = false; // ✅ NEW
    this.temporalData = null;
    this.timelineCache.clear();
    console.log("[TimeRenderer] Cleanup complete - renderer deinitialized");
  }
```

#### File 2: `src/plugins/treemap-explorer/renderers/BaseTreemapRenderer.ts`

**Step 4.5: Add Base Validation (Optional, 10 min)**
```typescript
// Add protected initialization tracking in base class
export abstract class BaseTreemapRenderer {
  protected container: HTMLElement;
  protected tooltip: HTMLElement;
  
  // ✅ NEW: Track base initialization
  protected baseInitialized: boolean = true; // True because passed in constructor

  constructor(container: HTMLElement, tooltip: HTMLElement) {
    this.container = container;
    this.tooltip = tooltip;
    
    if (!container || !tooltip) {
      console.error("[BaseTreemapRenderer] Missing required dependencies", {
        container: !!container,
        tooltip: !!tooltip
      });
      this.baseInitialized = false;
    }
  }

  // ✅ NEW: Validation helper for derived classes
  protected ensureBaseInitialized(methodName: string): void {
    if (!this.baseInitialized) {
      throw new Error(
        `[BaseTreemapRenderer] ${methodName}() called with invalid container/tooltip. ` +
        `Ensure renderer is properly constructed.`
      );
    }
  }
}
```

### Testing Checklist

```bash
# 1. Unit tests for validation
# Create: src/plugins/treemap-explorer/renderers/__tests__/TimeRenderer.validation.test.ts

describe("TimeRenderer - Initialization Validation", () => {
  it("should throw error if enrichData called before setTemporalData", () => {
    const container = document.createElement("div");
    const tooltip = document.createElement("div");
    const renderer = new TimeRenderer(container, tooltip);
    
    expect(() => {
      renderer.enrichData([], mockState);
    }).toThrow("called before setTemporalData");
  });

  it("should work normally after setTemporalData", () => {
    const container = document.createElement("div");
    const tooltip = document.createElement("div");
    const renderer = new TimeRenderer(container, tooltip);
    
    renderer.setTemporalData(mockTemporalData, new Map());
    
    expect(() => {
      renderer.enrichData([], mockState);
    }).not.toThrow();
  });
});

# 2. Run existing tests - should still pass
npm test -- TimeRenderer.test.ts

# 3. Integration test - verify error messages are helpful
# Manually break initialization order in TreemapExplorerPlugin
# Verify error message is clear and actionable
```

### Success Criteria
- [ ] Error thrown if methods called before initialization
- [ ] Error message is clear and helpful
- [ ] All existing tests pass
- [ ] New validation tests pass
- [ ] Console logs show initialization status

---

## 🎯 Session 5: Fix Bug #3 - Data Format Normalization Layer

**Objective:** Unified data format with adapter layer for backward compatibility

**Why Fifth:**
- Requires stable foundation from Sessions 1-4
- High risk (touches multiple files)
- Large refactor best done when everything else is stable

### Strategy: Create Adapter Pattern

Instead of changing both plugins to use the same format immediately, we create an adapter that normalizes data at the App.tsx level.

### Changes Required

#### File 1: New Adapter - `src/services/data/DataFormatAdapter.ts`

**Step 5.1: Create Adapter (45 min)**
```typescript
// src/services/data/DataFormatAdapter.ts

/**
 * Data Format Adapter
 * 
 * Handles conversion between different data formats:
 * - V1: Raw lifecycle-based format (lifecycle, authors, files, dirs)
 * - V2.1: Frontend-ready format (project_hierarchy, file_metrics_index, file_index)
 * 
 * Provides a single normalization point for plugin data consumption.
 */

import { DataProcessor } from "./DataProcessor";
import { FilterState } from "@/types/visualization";

export enum DataFormat {
  V1_RAW = "v1_raw",
  V2_1_FRONTEND = "v2.1_frontend",
  UNKNOWN = "unknown"
}

export interface NormalizedDataset {
  format: DataFormat;
  data: Record<string, any>;
  metadata: {
    normalizedFrom: DataFormat;
    timestamp: number;
    warnings: string[];
  };
}

export class DataFormatAdapter {
  /**
   * Detect which format the dataset is in
   */
  static detectFormat(dataset: Record<string, any>): DataFormat {
    // Check for V2.1 Frontend-ready format
    if (
      dataset.project_hierarchy &&
      dataset.file_metrics_index &&
      dataset.file_index
    ) {
      return DataFormat.V2_1_FRONTEND;
    }

    // Check for V1 Raw format
    if (
      dataset.lifecycle &&
      dataset.authors &&
      dataset.files &&
      dataset.dirs
    ) {
      return DataFormat.V1_RAW;
    }

    return DataFormat.UNKNOWN;
  }

  /**
   * Normalize any format to V2.1 (current target format)
   */
  static normalizeToV2(
    dataset: Record<string, any>,
    filters: FilterState
  ): NormalizedDataset {
    const detectedFormat = this.detectFormat(dataset);
    const warnings: string[] = [];

    console.log(`[DataFormatAdapter] Detected format: ${detectedFormat}`);

    switch (detectedFormat) {
      case DataFormat.V2_1_FRONTEND:
        // Already in target format
        return {
          format: DataFormat.V2_1_FRONTEND,
          data: dataset,
          metadata: {
            normalizedFrom: detectedFormat,
            timestamp: Date.now(),
            warnings: []
          }
        };

      case DataFormat.V1_RAW:
        // Convert V1 to V2.1
        console.log("[DataFormatAdapter] Converting V1 → V2.1");
        
        const optimized = DataProcessor.processRawData(
          dataset.lifecycle,
          dataset.authors,
          dataset.files,
          dataset.dirs,
          filters
        );

        // V2.1 structure includes project_hierarchy, file_metrics_index, etc.
        // Since V1 → V2.1 conversion may lose some fidelity, we keep original too
        const normalizedData = {
          // V2.1 format (for TreemapExplorer)
          project_hierarchy: optimized.tree,
          file_metrics_index: {}, // TODO: Build from optimized data if needed
          file_index: {}, // TODO: Build from optimized data if needed
          
          // Keep V1 format too (for TimelineHeatmap until it migrates)
          lifecycle: dataset.lifecycle,
          authors: dataset.authors,
          files: dataset.files,
          dirs: dataset.dirs,
          
          // Also include optimized versions
          _optimized: optimized,
        };

        warnings.push(
          "Converted from V1 format. Some data fidelity may be lost. " +
          "Consider updating dataset to V2.1 format."
        );

        return {
          format: DataFormat.V2_1_FRONTEND,
          data: normalizedData,
          metadata: {
            normalizedFrom: detectedFormat,
            timestamp: Date.now(),
            warnings
          }
        };

      case DataFormat.UNKNOWN:
      default:
        warnings.push(
          "Unknown data format. Dataset may be incomplete or corrupted."
        );
        
        return {
          format: DataFormat.UNKNOWN,
          data: dataset,
          metadata: {
            normalizedFrom: detectedFormat,
            timestamp: Date.now(),
            warnings
          }
        };
    }
  }

  /**
   * Check if a plugin requires specific format
   */
  static getPluginFormatRequirement(pluginId: string): DataFormat {
    switch (pluginId) {
      case "treemap-explorer":
        return DataFormat.V2_1_FRONTEND;
      case "timeline-heatmap":
        return DataFormat.V1_RAW; // For now, until migrated
      default:
        return DataFormat.V2_1_FRONTEND; // Default to new format
    }
  }

  /**
   * Validate that dataset meets plugin requirements
   */
  static validateForPlugin(
    dataset: NormalizedDataset,
    pluginId: string
  ): { valid: boolean; errors: string[] } {
    const required = this.getPluginFormatRequirement(pluginId);
    const errors: string[] = [];

    if (dataset.format === DataFormat.UNKNOWN) {
      errors.push("Dataset format is unknown or invalid");
      return { valid: false, errors };
    }

    // Check if required format is available
    const available = this.detectFormat(dataset.data);
    
    if (required !== available && !(dataset.data.lifecycle && dataset.data.project_hierarchy)) {
      errors.push(
        `Plugin ${pluginId} requires ${required} format, but only ${available} is available`
      );
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }
}
```

#### File 2: Update App.tsx to Use Adapter

**Step 5.2: Integrate Adapter in App.tsx (30 min)**
```typescript
// Add import
import { DataFormatAdapter, NormalizedDataset } from "@/services/data/DataFormatAdapter";

// Line ~46 - Add new state for normalized data
const [normalizedData, setNormalizedData] = useState<NormalizedDataset | null>(null);

// Line ~144 - Update data loading effect
useEffect(() => {
  const loadPluginData = async () => {
    if (!ui.activePluginId) return;

    const plugin = PluginRegistry.get(ui.activePluginId);
    if (!plugin) return;

    setPluginInitState({
      pluginId: ui.activePluginId,
      phase: 'loading',
      startTime: Date.now()
    });

    setLoading(true);
    setError(null);
    setRawData(null);
    setProcessedPluginData(null);
    setNormalizedData(null); // ✅ NEW

    try {
      setLoadingProgress({ loaded: 0, total: 1, phase: "metadata" });

      const requirements = PluginRegistry.getDataRequirements(ui.activePluginId);
      const result = await PluginDataLoader.loadForPlugin(requirements);

      if (!result.success) {
        throw new Error(`Failed to load data: ${result.errors.join(", ")}`);
      }

      // ✅ NEW: Normalize data format
      const normalized = DataFormatAdapter.normalizeToV2(result.data, filters);
      
      // Log warnings if any
      if (normalized.metadata.warnings.length > 0) {
        normalized.metadata.warnings.forEach(warning => {
          console.warn(`[App] Data format warning: ${warning}`);
        });
      }

      // Validate for current plugin
      const validation = DataFormatAdapter.validateForPlugin(
        normalized,
        ui.activePluginId
      );
      
      if (!validation.valid) {
        throw new Error(
          `Data validation failed: ${validation.errors.join(", ")}`
        );
      }

      setLoadingProgress({ loaded: 1, total: 1, phase: "complete" });
      setRawData(result.data); // Keep original
      setNormalizedData(normalized); // ✅ NEW: Store normalized version
      
    } catch (err) {
      console.error("Error loading plugin data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      
      setPluginInitState(prev => ({
        ...prev,
        phase: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  loadPluginData();
}, [ui.activePluginId, filters, setLoading, setError]);

// Update pluginDataInput memo to use normalized data
const pluginDataInput = useMemo(() => {
  if (!activePlugin || !normalizedData) return null;
  return normalizedData.data; // ✅ Use normalized data
}, [activePlugin, normalizedData]);
```

#### File 3: Document Format in Each Plugin

**Step 5.3: Add Format Documentation (20 min)**

**In TreemapExplorerPlugin.tsx:**
```typescript
export class TreemapExplorerPlugin implements VisualizationPlugin<TreemapExplorerState> {
  metadata = {
    id: "treemap-explorer",
    name: "Treemap Explorer",
    description: "Multi-lens code health, coupling, and temporal analysis",
    version: "3.0.0", // ✅ Bump version
    priority: 2,
    
    // ✅ NEW: Document expected format
    expectedDataFormat: "v2.1_frontend" as const,
    
    dataRequirements: [
      // ...
    ],
  };

  /**
   * ✅ NEW: Format documentation
   * This plugin expects V2.1 Frontend-ready format with:
   * - project_hierarchy: ProjectHierarchyNode tree
   * - file_metrics_index: Map of file paths to metrics
   * - file_index: V2FileIndex with file metadata
   * 
   * The DataFormatAdapter in App.tsx ensures this format is available.
   */
  processData(dataset: Record<string, any>, _config?: TreemapExplorerState): EnrichedFileData[] {
    // ...
  }
}
```

**In TimelineHeatmapPlugin.ts:**
```typescript
export class TimelineHeatmapPlugin implements VisualizationPlugin<...> {
  metadata = {
    id: "timeline-heatmap",
    name: "Timeline Heatmap",
    description: "Repository activity across time and directory structure",
    version: "6.0.0", // ✅ Bump version
    priority: 1,
    
    // ✅ NEW: Document expected format
    expectedDataFormat: "v1_raw" as const, // TODO: Migrate to v2.1
    
    dataRequirements: [
      // ...
    ],
  };

  /**
   * ✅ NEW: Format documentation
   * This plugin currently expects V1 Raw format with:
   * - lifecycle: File lifecycle events
   * - authors: Author network data
   * - files: File metadata
   * - dirs: Directory statistics
   * 
   * TODO: Migrate to V2.1 format in next phase for better consistency
   */
  processData(dataset: any, config?: HeatmapConfig): HeatmapData {
    // Keep existing logic - adapter provides both formats
    // ...
  }
}
```

### Testing Checklist

```bash
# 1. Create adapter tests
# File: src/services/data/__tests__/DataFormatAdapter.test.ts

describe("DataFormatAdapter", () => {
  it("should detect V2.1 format", () => {
    const dataset = {
      project_hierarchy: {},
      file_metrics_index: {},
      file_index: {}
    };
    expect(DataFormatAdapter.detectFormat(dataset)).toBe(DataFormat.V2_1_FRONTEND);
  });

  it("should detect V1 format", () => {
    const dataset = {
      lifecycle: {},
      authors: {},
      files: {},
      dirs: {}
    };
    expect(DataFormatAdapter.detectFormat(dataset)).toBe(DataFormat.V1_RAW);
  });

  it("should normalize V1 to V2.1", () => {
    const v1Dataset = { /* ... */ };
    const normalized = DataFormatAdapter.normalizeToV2(v1Dataset, filters);
    
    expect(normalized.format).toBe(DataFormat.V2_1_FRONTEND);
    expect(normalized.data.project_hierarchy).toBeDefined();
    expect(normalized.data.lifecycle).toBeDefined(); // Also preserved
  });
});

# 2. Test both plugins with adapter
npm test -- TreemapExplorer
npm test -- TimelineHeatmap

# 3. Integration test - switch between plugins rapidly
# Both should work without errors
# Console should show format detection logs

# 4. Check for warnings
# Should see warnings if V1 → V2.1 conversion happens
```

### Success Criteria
- [ ] Adapter correctly detects both formats
- [ ] Both plugins work with normalized data
- [ ] No breaking changes to either plugin
- [ ] Console logs show format detection/conversion
- [ ] Tests pass for both plugins
- [ ] Documentation clearly states expected formats

### Migration Path (Future)
```typescript
// TODO for Session 6 or later:
// 1. Migrate TimelineHeatmap to use V2.1 format
// 2. Remove V1 format support from adapter
// 3. Simplify adapter to just validate V2.1
```

---

## 🎯 Session 6: Testing, Polish & Documentation

**Objective:** Comprehensive testing and documentation of all changes

**Why Last:**
- Validate all previous sessions work together
- Document the new patterns for future developers
- Ensure test coverage meets standards

### Tasks

#### Task 6.1: Integration Tests (60 min)

**Create:** `src/__tests__/App.PluginLifecycle.test.tsx`

```typescript
describe("App - Complete Plugin Lifecycle", () => {
  it("should handle full initialization cycle for TreemapExplorer", async () => {
    const { getByTestId } = render(<App />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(getByTestId("app-container")).toHaveAttribute(
        "data-plugin-init-phase",
        "ready"
      );
    });

    // Switch to time lens
    const timeLensButton = screen.getByText("Time");
    act(() => {
      fireEvent.click(timeLensButton);
    });

    // Verify scrubber appears
    await waitFor(() => {
      expect(screen.getByTestId("timeline-scrubber")).toBeInTheDocument();
    });
  });

  it("should handle rapid plugin switching without errors", async () => {
    const { getByTestId } = render(<App />);
    
    // Switch plugins 10 times rapidly
    for (let i = 0; i < 10; i++) {
      const treemapButton = screen.getByText("Treemap Explorer");
      const heatmapButton = screen.getByText("Timeline Heatmap");
      
      act(() => {
        fireEvent.click(i % 2 === 0 ? treemapButton : heatmapButton);
      });
    }

    // Wait for final state to settle
    await waitFor(() => {
      const container = getByTestId("app-container");
      expect(container.getAttribute("data-plugin-init-phase")).toBe("ready");
    }, { timeout: 5000 });

    // No errors should have been thrown
    expect(screen.queryByTestId("error-container")).not.toBeInTheDocument();
  });

  it("should show temporal data confidence warnings", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn");
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId("app-container")).toHaveAttribute(
        "data-plugin-data-ready",
        "true"
      );
    });

    // Switch to time lens
    act(() => {
      fireEvent.click(screen.getByText("Time"));
    });

    // Check for confidence warnings
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("confidence date range")
    );

    consoleWarnSpy.mockRestore();
  });
});
```

#### Task 6.2: E2E Tests (45 min)

**Update:** `tests/e2e/specs/treemap-explorer.spec.ts`

```typescript
test("time scrubber appears immediately after switching to time lens", async ({ page }) => {
  await page.goto("/");

  // Select TreemapExplorer
  await page.click('[data-testid="plugin-selector"]');
  await page.click('text=Treemap Explorer');

  // Wait for plugin to be ready
  await page.waitForSelector('[data-plugin-init-phase="ready"]');

  // Switch to time lens
  await page.click('text=Time');

  // Scrubber should appear without delay
  const scrubber = page.locator('[data-testid="timeline-scrubber"]');
  await expect(scrubber).toBeVisible({ timeout: 1000 });
});

test("rapid plugin switching doesn't break time scrubber", async ({ page }) => {
  await page.goto("/");

  // Rapidly switch plugins
  for (let i = 0; i < 5; i++) {
    await page.click('[data-testid="plugin-selector"]');
    await page.click('text=Timeline Heatmap');
    await page.click('[data-testid="plugin-selector"]');
    await page.click('text=Treemap Explorer');
  }

  // Wait for final state
  await page.waitForSelector('[data-plugin-init-phase="ready"]');

  // Switch to time lens
  await page.click('text=Time');

  // Scrubber should still work
  const scrubber = page.locator('[data-testid="timeline-scrubber"]');
  await expect(scrubber).toBeVisible();
});
```

#### Task 6.3: Coverage Analysis (30 min)

```bash
# Run full coverage report
npm run test:coverage

# Generate HTML report
npm run test:coverage -- --coverage --coverageReporters=html

# Check specific files
# TemporalDataProcessor.ts: Should be >65% (was 32.97%)
# TimeRenderer.ts: Should be >70% (was 52%)
# App.tsx: Should be >75% (was 70.11%)

# Open coverage report
open coverage/index.html
```

**Coverage Targets:**
- TemporalDataProcessor.ts: **65%** → **75%**
- TimeRenderer.ts: **52%** → **75%**
- App.tsx: **70%** → **78%**
- TreemapExplorerPlugin.tsx: **65%** → **72%**
- Overall: **70.61%** → **78%**

#### Task 6.4: Documentation (60 min)

**Create:** `docs/ARCHITECTURE.md`

```markdown
# Git-Viz Architecture Documentation

## Plugin Lifecycle & Initialization

### State Machine (as of Session 3 refactor)

Plugins follow a strict 4-phase initialization cycle:

1. **loading**: Raw data is being fetched from datasets
2. **processing**: Plugin.processData() is executing (may be async)
3. **ready**: Data processed, plugin can render
4. **error**: Something failed, show error state

### Phase Transitions

```
[Plugin Switch] → loading → processing → ready → [render]
                     ↓          ↓          ↓
                   error ← - - - - - - - -
```

**Key Invariants:**
- `renderOverlay()` only called in 'ready' phase
- `processData()` may be aborted during 'processing'
- Plugin.cleanup() called before switching away

### Temporal Data Initialization (Session 1 fix)

TimeRenderer requires explicit initialization before use:

```typescript
// Step 1: Create renderer (in init())
this.timeRenderer = new TimeRenderer(container, tooltip);

// Step 2: Set temporal data (in processData())
this.timeRenderer.setTemporalData(temporalData, timelineCache);
// This sets internal flag: temporalDataReady = true

// Step 3: Only now can renderOverlay() return UI
if (!this.temporalDataReady) return null; // Guard
```

### Data Format Adapter (Session 5 addition)

**Problem:** Plugins expected different formats (V1 vs V2.1)

**Solution:** Adapter pattern normalizes at App.tsx level

```
Raw Data → DataFormatAdapter → Normalized Data → Plugin
```

**Benefits:**
- Plugins don't need to handle multiple formats
- Easy to add new formats in future
- Clear migration path (deprecate V1 gradually)

## Testing Patterns

### Unit Tests
- Test individual components/renderers in isolation
- Mock dependencies (temporal data, coupling index)
- Focus on edge cases (missing data, invalid dates)

### Integration Tests
- Test full plugin lifecycle
- Verify phase transitions
- Check cleanup happens properly

### E2E Tests
- Test user workflows (switching plugins, using scrubber)
- Verify UI appears as expected
- Performance under rapid interactions

## Common Pitfalls

### ❌ Don't: Call render methods before initialization
```typescript
renderer.enrichData(data, state); // ERROR if not initialized
```

### ✅ Do: Check readiness first
```typescript
if (this.temporalDataReady) {
  renderer.enrichData(data, state);
}
```

### ❌ Don't: Assume data format
```typescript
const dates = temporalData.days; // Might be Array or Object
```

### ✅ Do: Use adapter or handle both
```typescript
const normalized = DataFormatAdapter.normalizeToV2(dataset);
const dates = normalized.data.project_hierarchy;
```

## Debugging Tips

### Enable verbose logging
Set data attribute in browser console:
```javascript
document.body.dataset.debug = "true";
```

### Check plugin state
Inspect app container:
```javascript
$('[data-testid="app-container"]').dataset.pluginInitPhase
// Returns: "loading" | "processing" | "ready" | "error"
```

### Trace phase transitions
Watch console for:
```
[App] Rendering treemap-explorer in phase: ready
[TreemapExplorer] Temporal data marked as ready
```
```

**Create:** `docs/PLUGIN_DEVELOPMENT.md`

```markdown
# Plugin Development Guide

## Creating a New Plugin

### 1. Implement VisualizationPlugin Interface

```typescript
export class MyPlugin implements VisualizationPlugin<MyState> {
  metadata = {
    id: "my-plugin",
    name: "My Plugin",
    version: "1.0.0",
    expectedDataFormat: "v2.1_frontend",
    dataRequirements: [
      { dataset: "file_index", required: true, alias: "files" }
    ]
  };

  getInitialState(): MyState {
    return { /* default state */ };
  }

  processData(dataset: Record<string, any>, config?: MyState): any {
    // Transform data for visualization
    // This is async - use processDataCancellable if expensive
    return processedData;
  }

  init(container: HTMLElement, config: MyState): void {
    // Setup DOM, create renderers
    this.container = container;
  }

  render(data: any, config: MyState): void {
    // Draw visualization
  }

  cleanup(): void {
    // Cleanup resources, abort operations
  }
}
```

### 2. Register Plugin

```typescript
// src/plugins/init.ts
import { MyPlugin } from "./my-plugin/MyPlugin";

PluginRegistry.register(new MyPlugin());
```

### 3. Follow Initialization Pattern

**If your plugin has async initialization (like TimeRenderer):**

```typescript
class MyRenderer {
  private isInitialized = false;

  setData(data: any): void {
    this.data = data;
    this.isInitialized = true;
  }

  render(): void {
    if (!this.isInitialized) {
      throw new Error("Call setData() before render()");
    }
    // ... render logic
  }
}
```

### 4. State Management

**Declare which state fields require reprocessing:**

```typescript
processingStateKeys: Extract<keyof MyState, string>[] = [
  "filterValue",  // Changing this triggers processData()
  "threshold",    // Changing this triggers processData()
];

// Other state fields only trigger re-render
```

### 5. Testing Requirements

Create test files:
- `__tests__/MyPlugin.test.ts` - Unit tests
- `__tests__/MyPlugin.integration.test.ts` - Integration tests

Minimum coverage: **70%**

### 6. Data Format Expectations

Document in metadata:
```typescript
/**
 * This plugin expects V2.1 format with:
 * - project_hierarchy: Tree structure
 * - file_metrics_index: Per-file metrics
 * 
 * DataFormatAdapter ensures this format is available.
 */
```

## Best Practices

### Performance
- Use `processDataCancellable` for operations >100ms
- Check `signal.aborted` in loops
- Debounce expensive state updates

### Error Handling
- Validate data structure in `processData()`
- Return empty/default visualization for missing data
- Log errors with plugin context: `[MyPlugin] Error: ...`

### Cleanup
- Clear intervals/timeouts
- Remove event listeners
- Set abort flags
- Reset initialization state

### Accessibility
- Use semantic HTML
- Add ARIA labels
- Support keyboard navigation
- Ensure color contrast >4.5:1
```

#### Task 6.5: Update README.md (30 min)

Add section about recent improvements:

```markdown
## Recent Improvements (v3.0)

### Fixed Time Scrubber Reliability
Time Lens scrubber now appears consistently thanks to explicit readiness tracking. No more disappearing controls!

### Robust Plugin Switching
Enhanced state machine ensures clean transitions between plugins, even during rapid switching.

### Unified Data Handling
New adapter layer normalizes data formats, ensuring compatibility between all plugins.

### Better Error Messages
Renderers now provide clear, actionable error messages when initialization fails.

### Improved Test Coverage
Test coverage increased from 70% to 78%, with comprehensive integration tests.

## Developer Notes

See `docs/ARCHITECTURE.md` for detailed architecture documentation.
See `docs/PLUGIN_DEVELOPMENT.md` for plugin development guidelines.
```

### Final Validation Checklist

```bash
# 1. Run all tests
npm test

# 2. Check coverage
npm run test:coverage
# Should show ~78% overall coverage

# 3. Run E2E tests
npm run test:e2e

# 4. Build check
npm run build
npm run type-check

# 5. Manual smoke test
npm run dev
# Test all workflows:
# - Plugin switching (rapid)
# - Time lens scrubber
# - Filters
# - Detail panels
# - All lens modes (debt, coupling, time)

# 6. Performance check
# - Open DevTools Performance tab
# - Record plugin switch
# - Should be <500ms total

# 7. Console cleanliness
# - No errors
# - Warnings should be intentional (format conversion, fallbacks)
# - Phase transition logs should be clear
```

### Success Criteria
- [ ] All tests pass (unit, integration, E2E)
- [ ] Coverage ≥78%
- [ ] Build succeeds with no errors
- [ ] Manual testing shows no regressions
- [ ] Documentation is complete and accurate
- [ ] No console errors in production build

---

## 📊 Overall Progress Tracker

Use this checklist to track progress across all sessions:

### Session 1: Time Scrubber Fix ✅
- [ ] Readiness flag added
- [ ] renderOverlay() guards updated
- [ ] cleanup() resets flag
- [ ] Tests pass
- [ ] Manual testing confirms fix

### Session 2: Fallback Consolidation ✅
- [ ] DateRangeResult interface created
- [ ] getDateRange() refactored
- [ ] calculateRangeFromFiles() added
- [ ] TreemapExplorer uses new API
- [ ] Coverage increased to >65%

### Session 3: Effect Orchestration ✅
- [ ] Plugin state machine added
- [ ] Effects updated with phase checks
- [ ] Debug attributes added
- [ ] act() warnings eliminated
- [ ] Rapid switching stable

### Session 4: Renderer Validation ✅
- [ ] Initialization tracking added
- [ ] Validation methods created
- [ ] Error messages are clear
- [ ] Tests cover validation
- [ ] Coverage on renderers increased

### Session 5: Data Format Adapter ✅
- [ ] Adapter created
- [ ] App.tsx integrated
- [ ] Both plugins work
- [ ] Format documented
- [ ] Tests pass

### Session 6: Testing & Docs ✅
- [ ] Integration tests created
- [ ] E2E tests updated
- [ ] Coverage ≥78%
- [ ] Architecture.md written
- [ ] PluginDevelopment.md written
- [ ] README updated

---

## 🚀 Quick Start for Each Session

### Before Starting Any Session:
```bash
git checkout main
git pull
git checkout -b fix/bug-{number}-{name}
npm install
npm test  # Ensure clean start
```

### After Completing Each Session:
```bash
npm test  # All tests pass
npm run build  # Build succeeds
git add .
git commit -m "fix: [Bug #{number}] {description}"
git push origin fix/bug-{number}-{name}
# Create PR with testing notes
```

### If You Need to Pause Mid-Session:
```bash
git stash save "WIP: Session {N} - {description}"
# Resume later with:
git stash pop
```

---

## 💡 Tips for Success

1. **Test after every change** - Don't accumulate untested code
2. **Keep commits atomic** - One logical change per commit
3. **Read error messages carefully** - They're designed to be helpful
4. **Check console logs** - Phase transitions should be clear
5. **Don't skip documentation** - Future you will thank you

**Good luck! Each session brings you closer to a rock-solid codebase. 🎯**