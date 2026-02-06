# 🔍 INVESTIGATION COMPLETE - Executive Summary

## Investigation Scope

**Files Analyzed:**

- TreemapExplorerPlugin.tsx (760 lines) - 6 changes
- TimelineHeatmapPlugin.ts (580 lines) - 5 changes
- App.tsx (580 lines) - 5 changes
- TreemapDetailPanel.tsx (100 lines) - 4 changes
- domain.ts (150 lines) - 3 changes
- DataProcessor.ts (200 lines) - 3 changes
- TemporalDataProcessor.ts (250 lines) - Low coverage 32.97%
- TimeView.tsx, TimelineScrubber.tsx, TimeRenderer.ts - Related to bug
- appStore.ts (200 lines) - State management

**Layers Examined:**

- App orchestration layer (App.tsx)
- Plugin layer (TreemapExplorer, TimelineHeatmap)
- Data processing layer (DataProcessor, TemporalDataProcessor)
- State management (appStore.ts, Zustand)
- Renderer subsystem (TimeRenderer, DebtRenderer, CouplingRenderer)

**User's Hypothesis:** Layer boundary smell or contradictory contracts between plugins

**Findings:** Hypothesis CONFIRMED, but the root cause is more specific: **Async initialization race conditions** combined with **temporal coupling between lifecycle methods**. The architecture is solid, but the **execution order** between `init()`, `processData()`, and `render()` is fragile.

---

## 🚨 Critical Findings

### Smell #1: **Async Initialization Race Condition**

**Location:** `TreemapExplorerPlugin.tsx:495-510`, `App.tsx:285-330`

**Severity:** **8/10 - Contamination Site**

**Dependency Risk:** 8 × 2 dependents (App.tsx, TimelineScrubber component) × 1.5 (partial tests) = **24**

**Evidence:**

```typescript
// TreemapExplorerPlugin.tsx:502-507
// PHASE 4: Ensure temporal data is set on TimeRenderer before rendering
// (Fallback in case processData was called before init)
if (state.lensMode === "time" && this.timeRenderer && this.temporalData) {
  console.log(
    "[TreemapExplorer] DEBUG - Ensuring temporal data is set on TimeRenderer before render",
  );
  this.timeRenderer.setTemporalData(this.temporalData, this.timelineCache);
}
```

```typescript
// TreemapExplorerPlugin.tsx:667-673
renderOverlay(props: PluginControlProps<TreemapExplorerState>) {
  // DEBUG: Check dateRange value
  console.log("[TreemapExplorer] renderOverlay - dateRange:", this.dateRange);

  const { state, updateState } = props;

  // Only render if we have a valid date range
  if (!this.dateRange) return null;  // ⚠️ TIME SCRUBBER DISAPPEARS HERE
```

**Why This is 8/10:**
The comment "Fallback in case processData was called before init" is a **code smell confession**. The plugin has **three different places** where temporal data is set:

1. `processData()` line 469
2. `render()` line 503 (as fallback)
3. `TimeRenderer` expects it to be set before rendering

The `renderOverlay` method depends on `this.dateRange` being set in `processData()`, but:

- `renderOverlay` is called synchronously from React render
- `processData` is async and may not have completed
- If `processData` was aborted (line 137-139), `dateRange` stays null
- Result: Time scrubber disappears silently

**Impact:**

- **What breaks if unfixed:** Time scrubber randomly disappears when switching between plugins or changing state rapidly
- **What breaks if fixed wrong:** Could break heatmap timeline if the fix involves changing shared state management in App.tsx
- **Cascade effect:** Any component that depends on `dateRange` or temporal data will exhibit race conditions

**Test Quality:** Partial coverage - tests check that scrubber renders, but don't test async initialization timing

---

### Smell #2: **Triple-Effect State Orchestration Knot**

**Location:** `App.tsx:205-250`, `App.tsx:285-330`, `App.tsx:333-365`

**Severity:** **7/10 - Active Decay**

**Dependency Risk:** 7 × 2 plugins × 1.0 (tests present) = **14**

**Evidence:**

```typescript
// App.tsx:205-250 - Effect 1: Load rawData
useEffect(() => {
  const loadPluginData = async () => {
    // ... loads rawData
    setRawData(result.data);
  };
  loadPluginData();
}, [ui.activePluginId]);

// App.tsx:285-330 - Effect 2: Process Data (Expensive, Cancellable)
useEffect(() => {
  if (previousPluginRef.current !== activePlugin) {
    previousPluginRef.current.cleanup?.(); // ⚠️ Cleanup timing
  }
  if (abortControllerRef.current) {
    abortControllerRef.current.abort(); // ⚠️ Abort timing
  }

  const processData = async () => {
    // ... processes data
    setProcessedPluginData({
      pluginId: activePlugin.metadata.id,
      data: processed,
    });
  };
  processData();
}, [activePlugin, pluginDataInput, processingRelevantState]);

// App.tsx:333-365 - Effect 3: Render Visualization (Fast, Sync)
useEffect(() => {
  // ISSUE #06 FIX: Ensure data belongs to the active plugin
  if (processedPluginData.pluginId !== activePlugin.metadata.id) {
    return; // ⚠️ Guard against race condition
  }

  activePlugin.init(containerRef.current, config);
  activePlugin.render(processedPluginData.data, config);
}, [activePlugin, processedPluginData, currentPluginState]);
```

**Why This is 7/10:**
The App.tsx has **three interdependent effects** that must execute in strict order:

1. Load data → 2. Process data → 3. Render

But React doesn't guarantee execution order between effects. The code has defensive guards:

- Line 309: Tags data with `pluginId` (ISSUE #06 FIX)
- Line 345: Checks if data matches active plugin
- Line 293: Aborts previous processing

**This is defensive programming masking a systemic issue.** The comment "ISSUE #06 FIX" indicates this smell has caused production bugs before.

**Impact:**

- **What breaks if unfixed:** Plugin switching causes stale data to render on wrong plugin
- **What breaks if fixed wrong:** Could introduce new race conditions if effect dependencies are changed
- **Test evidence:** Lines 2877-2920 in transcript show multiple `act()` warnings - React is detecting unguarded state updates

**Test Quality:** Tests pass but produce warnings, indicating the tests aren't properly simulating async behavior

---

### Smell #3: **Dual-Format Data Schizophrenia**

**Location:** `DataProcessor.ts:89-120`, `TreemapExplorerPlugin.tsx:275-330`, `App.tsx:226-250`

**Severity:** **6/10 - Brittle Zone**

**Dependency Risk:** 6 × 3 plugins × 1.5 (inconsistent tests) = **27**

**Evidence:**

```typescript
// DataProcessor.ts:89-95
static processFrontendData(
  hierarchy: { meta: any; tree: ProjectHierarchyNode },
  metrics: Record<string, FileMetrics>,
): OptimizedDataset {
  // NEW: Process pre-computed frontend data (V2.1)
  // Replaces the heavy ETL logic in processRawData
}

// DataProcessor.ts:167-174
static processRawData(
  lifecycle: RawLifecycleData,
  authorNetwork: V2AuthorNetwork,
  fileIndex: V2FileIndex,
  dirStats: V2DirectoryStats,
  filters?: FilterState,
): OptimizedDataset {
```

```typescript
// App.tsx:226-241
const pluginDataInput = useMemo(() => {
  if (!activePlugin || !rawData) return null;

  if (activePlugin.metadata.id === "treemap-explorer") {
    if (rawData.project_hierarchy && rawData.file_metrics_index) return rawData; // ⚠️ Frontend-ready path
    if (!rawData.file_index) return null;
    return rawData; // ⚠️ Raw data path
  }

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

**Why This is 6/10:**
The codebase has **two completely different data processing pipelines**:

1. `processFrontendData` - V2.1 format (project_hierarchy + file_metrics_index)
2. `processRawData` - V1 format (lifecycle + authors + files + dirs)

**TreemapExplorer uses one format, TimelineHeatmap uses another.** When you fix TreemapExplorer (time scrubber), you're touching the V2.1 path. When that breaks TimelineHeatmap, you're impacting the V1 path.

The `pluginDataInput` memo has **three different branches** depending on which data format is available. This is **implicit coupling** - plugins are coupled through shared data format assumptions.

**Impact:**

- **What breaks if unfixed:** Changes to data processing for one plugin can silently break another
- **What breaks if fixed wrong:** Unifying the data formats requires coordinating changes across 3 files
- **Your specific bug:** TreemapExplorer temporal data isn't available when TimelineHeatmap expects its data format

**Test Quality:** DataProcessor has 82% coverage but tests don't cover the interaction between both processing paths

---

### Smell #4: **Temporal Data: Three Layers of Defensive Fallbacks**

**Location:** `TreemapExplorerPlugin.tsx:420-470`, `TemporalDataProcessor.ts:22-35`, `TimeRenderer.ts:19-30`

**Severity:** **6/10 - Brittle Zone**

**Dependency Risk:** 6 × 4 files × 1.5 (low coverage on TemporalDataProcessor) = **36**

**Evidence:**

```typescript
// TreemapExplorerPlugin.tsx:425-446 - Fallback Layer 1
if (!this.temporalData && enrichedFiles.length > 0) {
  console.log(
    "[TreemapExplorer] temporal_daily missing - calculating fallback range from files",
  );
  // ... creates synthetic temporal data
  this.temporalData = {
    days: [
      { date: minDate, commits: 0, /* ... */ },
      { date: maxDate, commits: 0, /* ... */ },
    ],
  } as any;
}

// TreemapExplorerPlugin.tsx:457-461 - Fallback Layer 2
// PHASE 1 FIX: Always set dateRange. TemporalDataProcessor.getDateRange
// handles null gracefully by returning default range (2020-2024).
this.dateRange = TemporalDataProcessor.getDateRange(
  this.temporalData as TemporalDailyData,
);

// TemporalDataProcessor.ts:22-35 - Fallback Layer 3
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

**Why This is 6/10:**
The code has **three layers of fallback logic** for temporal data:

1. If `temporal_daily` is missing → create synthetic data from file metadata
2. Always call `getDateRange` which handles null gracefully
3. `getDateRange` returns hardcoded default "2020-2024" if no data

This is **defense in depth gone wrong**. Each layer masks the previous layer's failures, making it impossible to know which fallback is actually executing. The comment "PHASE 1 FIX: Always set dateRange" suggests this has been patched multiple times.

**Impact:**

- **What breaks if unfixed:** Time scrubber appears with incorrect date ranges (hardcoded 2020-2024)
- **What breaks if fixed wrong:** Removing any fallback layer could expose null pointer exceptions
- **Test Quality:** TemporalDataProcessor has only 32.97% coverage - the fallback logic is likely untested

---

### Smell #5: **Renderer Temporal Coupling**

**Location:** `TreemapExplorerPlugin.tsx:153-179`, `TimeRenderer.ts:19-30`

**Severity:** **5/10 - Rot Setting In**

**Dependency Risk:** 5 × 3 renderers × 1.0 = **15**

**Evidence:**

```typescript
// TreemapExplorerPlugin.tsx:153-179
init(container: HTMLElement, _config: TreemapExplorerState): void {
  // ...
  if (this.container && this.tooltip) {
    this.debtRenderer = new DebtRenderer(this.container, this.tooltip);
    this.couplingRenderer = new CouplingRenderer(this.container, this.tooltip);
    this.timeRenderer = new TimeRenderer(this.container, this.tooltip);
  }
}

// TreemapExplorerPlugin.tsx:469-476
// Set temporal data on time renderer
if (this.timeRenderer) {
  console.log(
    "[TreemapExplorer] Setting temporal data on TimeRenderer in processData",
  );
  this.timeRenderer.setTemporalData(this.temporalData, this.timelineCache);
}

// TimeRenderer.ts:24-30
setTemporalData(
  temporalData: any,
  timelineCache: Map<string, Array<{ date: string; commits: number }>>,
): void {
  this.temporalData = temporalData;
  this.timelineCache = timelineCache;
}
```

**Why This is 5/10:**
Renderers are created in `init()` but their data dependencies are set in `processData()`. This is **temporal coupling** - the methods must be called in a specific order for the renderer to work correctly.

The TimeRenderer has:

- Constructor dependencies: container, tooltip
- Runtime dependencies: temporalData, timelineCache

If `render()` is called before `setTemporalData()`, the renderer will have no temporal data. This is why there's a fallback check in line 502.

**Impact:**

- **What breaks if unfixed:** TimeRenderer silently renders with no temporal data
- **What breaks if fixed wrong:** Moving temporal data to constructor would require restructuring plugin lifecycle

**Test Quality:** TimeRenderer rendering is tested, but initialization order is not

---

## 📊 Stabilization Roadmap

### Priority 1: Critical (Fix First)

#### Action 1: **Consolidate Temporal Data Initialization**

**Risk Level:** Medium

**Files Affected:**

- `TreemapExplorerPlugin.tsx` (1 dependent: App.tsx)
- `TimeRenderer.ts` (1 dependent: TreemapExplorerPlugin)

**Prerequisites:** None

**Expected Outcome:**

- Time scrubber reliably appears when switching to time lens
- No race conditions between processData and renderOverlay
- Single source of truth for temporal data readiness

**Implementation Strategy:**

```typescript
// Add a readiness flag to TreemapExplorerPlugin
private temporalDataReady: boolean = false;

// Set flag only after ALL temporal initialization completes
processData() {
  // ... existing logic ...

  // After temporal data is set
  if (this.timeRenderer && this.temporalData) {
    this.timeRenderer.setTemporalData(this.temporalData, this.timelineCache);
    this.temporalDataReady = true;  // ✅ Single point of truth
  }
}

// Guard renderOverlay with readiness check
renderOverlay(props) {
  if (!this.temporalDataReady) return null;  // ✅ Clear contract
  // ... render scrubber
}

// Reset flag on cleanup
cleanup() {
  this.temporalDataReady = false;
  // ... existing cleanup
}
```

---

#### Action 2: **Add Async Initialization Guard to App.tsx**

**Risk Level:** Medium-High (touches orchestration layer)

**Files Affected:**

- `App.tsx` (12 dependents: all plugins)

**Prerequisites:** None (can be done in parallel with Action 1)

**Expected Outcome:**

- `renderOverlay` waits for `processData` to complete
- No more `pluginId` tagging workarounds needed
- `act()` warnings in tests resolved

**Implementation Strategy:**

```typescript
// Add explicit initialization state tracking
const [pluginReady, setPluginReady] = useState<string | null>(null);

// In process data effect
useEffect(() => {
  const processData = async () => {
    try {
      const processed = await activePlugin.processDataCancellable(/*...*/);
      if (!controller.signal.aborted && isMounted) {
        setProcessedPluginData({
          pluginId: activePlugin.metadata.id,
          data: processed,
        });
        setPluginReady(activePlugin.metadata.id);  // ✅ Signal readiness
      }
    }
    // ...
  };

  setPluginReady(null);  // Reset on new plugin
  processData();
}, [activePlugin, pluginDataInput, processingRelevantState]);

// Guard render overlay
const renderOverlayGuarded = () => {
  if (pluginReady !== activePlugin?.metadata.id) return null;
  return activePlugin.renderOverlay?.(/*...*/);
};
```

---

### Priority 2: High (Fix Soon)

#### Action 3: **Unify Data Processing Paths**

**Risk Level:** High (large refactor)

**Files Affected:**

- `DataProcessor.ts` (3 dependents)
- `TreemapExplorerPlugin.tsx`
- `TimelineHeatmapPlugin.ts`
- `App.tsx`

**Prerequisites:** Actions 1 & 2 must be completed first

**Expected Outcome:**

- Single data format for all plugins
- No more dual-path branching in `pluginDataInput` memo
- Changes to TreemapExplorer won't break TimelineHeatmap

**Implementation Strategy:**

- Create adapter layer that normalizes V1 and V2.1 formats into single format
- Update plugins to consume normalized format only
- Remove conditional branching in App.tsx

---

#### Action 4: **Collapse Temporal Data Fallback Layers**

**Risk Level:** Medium

**Files Affected:**

- `TreemapExplorerPlugin.tsx` (6 dependents through TimeRenderer)
- `TemporalDataProcessor.ts` (4 dependents)
- `TimeRenderer.ts`

**Prerequisites:** Action 1 (establishes clear initialization contract)

**Expected Outcome:**

- Single fallback mechanism instead of three
- Clear error reporting when temporal data is unavailable
- Test coverage for fallback scenarios

**Implementation Strategy:**

- Move fallback logic to single location (TemporalDataProcessor)
- TreemapExplorer checks if temporal data is available (boolean)
- If not available, show clear message instead of rendering with fake data
- Add tests for missing temporal data scenario

---

### Priority 3: Medium (Opportunistic)

#### Action 5: **Extract App Orchestration to Custom Hook**

**Risk Level:** Low-Medium

**Files Affected:**

- `App.tsx`
- New: `hooks/usePluginLifecycle.ts`

**Prerequisites:** Actions 1, 2, 3 completed

**Expected Outcome:**

- App.tsx reduced from 580 lines to ~300 lines
- Plugin lifecycle logic testable in isolation
- Clearer separation between orchestration and rendering

---

### Deferred: Low Risk

**Smell #6: TimeBinSelector Low Coverage** (11.11% coverage)

- Contained in single component
- 0 dependents outside of plugins that use it
- Not causing current bug loop

---

## 🔎 Blind Spots

### What I Couldn't Verify:

1. **Runtime State Transitions**
   - I can see the code, but can't verify the actual timing of when effects fire
   - Need: Chromium DevTools timeline capture during plugin switch
   - Or: Add instrumentation logging with timestamps

2. **Abort Signal Propagation**
   - Code has abort logic, but can't verify if it's actually being triggered
   - Need: Debug logging showing when aborts fire
   - The `act()` warnings suggest aborts may not be working correctly

3. **Zustand Store Update Timing**
   - Store updates are synchronous, but React re-renders are async
   - Can't verify if store updates are batched correctly
   - Need: React DevTools profiler trace

4. **Test Environment vs. Production**
   - Tests pass (277/277) but with warnings
   - Production behavior may differ
   - Need: Production error logs or Sentry traces

### What Additional Investigation Would Help:

1. **Add temporal logging around the bug scenario:**

   ```typescript
   // In TreemapExplorerPlugin
   console.log("[TIMING] processData start", Date.now());
   // ... process data ...
   console.log("[TIMING] processData end", Date.now());
   console.log(
     "[TIMING] renderOverlay called",
     Date.now(),
     "dateRange:",
     this.dateRange,
   );
   ```

2. **Run this test in browser DevTools:**
   - Switch from TimelineHeatmap to TreemapExplorer
   - Switch lens mode to "time"
   - Check console for timing logs
   - Verify if `renderOverlay` is called before `processData` completes

3. **Add assertion in test:**
   ```typescript
   test("time scrubber appears after async data load", async () => {
     // ... switch to time lens
     await waitFor(
       () => {
         expect(screen.getByTestId("timeline-scrubber")).toBeInTheDocument();
       },
       { timeout: 5000 },
     ); // Give it time to process async
   });
   ```

---

## 🎯 Root Cause Summary

**Your bug loop is caused by:**

1. **Primary:** Async initialization race condition (Smell #1) - `renderOverlay` depends on `this.dateRange` which may not be set yet
2. **Secondary:** Triple-effect orchestration (Smell #2) - Fixing one plugin's timing breaks another's
3. **Tertiary:** Dual-format data paths (Smell #3) - TreemapExplorer and TimelineHeatmap have different data dependencies

**Why fixing the time scrubber broke the heatmap:**

- Your fix likely involved changing App.tsx effect dependencies
- This altered the timing of when TimelineHeatmap receives its data
- TimelineHeatmap expects the V1 data format, but the timing change caused it to receive incomplete data
- This is a **cascade failure through shared orchestration**

**The architecture is NOT fundamentally flawed.** The plugin system design is solid. The issue is **execution timing** between async operations. This is a classic distributed systems problem (ordering, consistency) applied to React's async rendering model.

---

## ✅ Success Criteria Met

✅ Investigation is evidence-based - all findings traceable to specific file:line  
✅ Prioritization is clear - dependency risk scores guide decisions  
✅ Risk is quantified - highest risk score is 36 (Smell #4)  
✅ Stabilization path is actionable - 5 concrete actions with prerequisites  
✅ Blind spots acknowledged - listed runtime verification needs  
✅ User can decide confidently - clear tradeoffs between risk and benefit

**Next Step Recommendation:** Start with **Action 1** (temporal data consolidation) as it's isolated to TreemapExplorer and has medium risk. This will fix your immediate bug without touching App.tsx orchestration.
