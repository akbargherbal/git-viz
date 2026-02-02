# Treemap Explorer — Formalized Refactoring Plan
## Multi-Session Implementation Strategy

**Version:** 2.0  
**Created:** February 2, 2026  
**Principle:** One phase per session. Each phase is independently verifiable and shippable.

---

## 📋 Progress Tracker

| Phase | Session | Status | Completion Date |
|-------|---------|--------|-----------------|
| Phase 1: Data Foundation | 1 | ✅ **COMPLETE** | Feb 2, 2026 |
| Phase 2: Coupling Lens Restoration | 2 | ⏳ Pending | — |
| Phase 3: Time Lens Activity Data | 3 | ⏳ Pending | — |
| Phase 4: Renderer Unification | 4 | ⏳ Pending | — |
| Phase 5: Cleanup & Optimization | 5 | ⏳ Pending | — |

---

## Phase 1: Data Foundation ✅ COMPLETE

**Status:** ✅ Shipped  
**Session:** 1  
**Duration:** ~2 hours  
**Files Modified:** 3

### What Was Accomplished

Fixed three critical data correctness bugs:
1. ✅ Operations data (M/A/D) now sourced from `file_index` (not fabricated)
2. ✅ Health scores sourced from `project_hierarchy.attributes` + computed factors
3. ✅ Age factor dormancy penalties active (was dead)

### Success Metrics Achieved

- ✅ All 299 tests passing
- ✅ Operations display shows varied realistic counts
- ✅ Health score distribution shows red/yellow/green gradient
- ✅ Filter functionality operational
- ✅ Build: success, Type-check: clean

### Deliverables

- Modified `TreemapExplorerPlugin.tsx` with three-source data merge
- Updated `ProjectHierarchyNode` type definition
- Filter panel state synchronization fix
- Phase 1 completion summary document

**See:** `PHASE_1_COMPLETION_SUMMARY.md` for full details.

---

## Phase 2: Coupling Lens Restoration

**Session:** 2  
**Estimated Duration:** 45 minutes  
**Complexity:** Low  
**Dependencies:** Phase 1 complete

### Goal

Fix the lossy coupling index and broken color scale so the Coupling Lens renders accurate, symmetric relationships with meaningful visual differentiation.

### Audit References

- §3.2: Lossy/asymmetric coupling index
- §3.4: Color scale saturates at 0.1

### Changes Required

#### 2.1 Add Full Coupling Dataset

**File:** `TreemapExplorerPlugin.tsx` - `metadata.dataRequirements`

```typescript
{ 
  dataset: "cochange_network", 
  required: false,  // Optional - 16 MB dataset
  alias: "cochange_network" 
}
```

#### 2.2 Replace Coupling Index Construction

**File:** `TreemapExplorerPlugin.tsx` - `processData()` method

**Current (lossy):**
```typescript
// Hand-rolled index from top_partners only
this.couplingIndex = new Map();
enrichedFiles.forEach((file) => {
  this.couplingIndex.set(file.key, {
    partners: file.coupledFiles.map(...),  // Only top partners
    ...
  });
});
```

**After (complete):**
```typescript
if (dataset.cochange_network) {
  // Use full edge set from cochange_network
  this.couplingIndex = CouplingDataProcessor.process(dataset.cochange_network);
  CouplingDataProcessor.enrichWithCoupling(this.data, dataset.cochange_network);
} else {
  // Fallback: hand-rolled index (log warning)
  console.warn('[TreemapExplorer] cochange_network unavailable, using degraded coupling index');
  // ... existing hand-rolled logic
}
```

#### 2.3 Fix Color Scale Saturation

**File:** `utils/colorScales.ts` - `getCouplingColor()`

**Before:**
```typescript
const intensity = Math.min(coupling / 0.1, 1); // Saturates at 0.1
```

**After:**
```typescript
const intensity = Math.min(coupling / 0.8, 1); // Saturates at 0.8
```

**Rationale:** Dataset shows coupling strengths up to 0.72+. Current scale makes everything >0.1 identical.

### Success Criteria

- [ ] Network tab shows `cochange_network.json` fetching (16 MB)
- [ ] Coupling arcs are symmetric: File A→B and File B→A both render
- [ ] Detail panel partner list matches arc overlay
- [ ] Purple color gradient is visible (dark → light → bright)
- [ ] Coupling mode shows varied cell colors (not uniform purple wash)
- [ ] Tests still passing (299/299)

### Testing Steps

1. Switch to Coupling Lens
2. Select any file with coupling partners
3. Verify arcs render in both directions
4. Check detail panel lists matching partners
5. Observe color gradient across cells (not uniform)
6. Open network tab, confirm `cochange_network.json` loaded

### Estimated Impact

**Performance:**
- Additional 16.3 MB load (cochange_network)
- Optional dataset - only loads when Coupling Lens activated
- Demand-loaded, not pre-cached

**User Experience:**
- Coupling relationships are now accurate and complete
- Visual differentiation between weak/medium/strong coupling
- Symmetric arcs improve relationship discovery

---

## Phase 3: Time Lens Activity Data

**Session:** 3  
**Estimated Duration:** 1.5 hours  
**Complexity:** Medium  
**Dependencies:** Phase 1 complete

### Goal

Populate the Time Lens sparklines and enable directory-level activity visualization by loading per-file timeline data.

### Audit References

- §2.3: Activity sparkline is permanent stub
- §3.3: Time Lens has no activity visualization layer

### Changes Required

#### 3.1 Add Activity Datasets

**File:** `TreemapExplorerPlugin.tsx` - `metadata.dataRequirements`

```typescript
{ dataset: "file_lifecycle", required: false, alias: "file_lifecycle" },
{ dataset: "temporal_activity_map", required: false, alias: "temporal_activity_map" }
```

Both optional because:
- Large datasets (20.8 MB + 393 KB)
- Only needed in Time Lens mode
- Demand-loaded

#### 3.2 Implement Sparkline Data Builder

**File:** `services/data/TemporalDataProcessor.ts` - `buildActivityTimeline()`

**Current (stub):**
```typescript
private static buildActivityTimeline(
  _file: EnrichedFileData,
  _temporalDaily: TemporalDailyData,
): Array<{ date: string; commits: number }> | undefined {
  return undefined; // Stub
}
```

**After (working):**
```typescript
private static buildActivityTimeline(
  file: EnrichedFileData,
  fileLifecycle: FileLifecycleData,
  bucketWeeks: number = 4
): Array<{ date: string; commits: number }> | undefined {
  const events = fileLifecycle.files[file.path];
  if (!events || events.length === 0) return undefined;
  
  // Group events into weekly buckets
  const buckets = this.bucketEventsByWeek(events, bucketWeeks);
  
  // Return sparkline data points
  return buckets.map(bucket => ({
    date: bucket.weekStart,
    commits: bucket.commitCount
  }));
}
```

#### 3.3 Pre-compute Timelines (Performance Optimization)

**File:** `TreemapExplorerPlugin.tsx` - new cache field

Add timeline cache to avoid recomputing on every scrubber drag:

```typescript
private timelineCache: Map<string, Array<{ date: string; commits: number }>> = new Map();

// In processData(), after file_lifecycle loads:
if (dataset.file_lifecycle) {
  this.timelineCache = TemporalDataProcessor.precomputeTimelines(
    enrichedFiles,
    dataset.file_lifecycle
  );
}
```

Then in `buildActivityTimeline()`, lookup instead of recompute.

#### 3.4 Wire Timeline Data to TimeView

**File:** `components/TimeView.tsx`

Update to display sparkline when `file.activityTimeline` exists:

```typescript
{file.activityTimeline && (
  <ActivitySparkline 
    data={file.activityTimeline} 
    height={40}
  />
)}
```

The sparkline rendering component already exists (audit confirmed).

### Success Criteria

- [ ] Network tab shows `file_lifecycle.json` and `temporal_activity_map.json` loading
- [ ] Time Lens detail panel shows populated sparkline for files with history
- [ ] Sparkline bars vary in height (not uniform)
- [ ] Files with no history show no sparkline (graceful absence)
- [ ] Timeline scrubbing remains responsive (<100ms)
- [ ] Tests passing (299/299 + new timeline tests)

### Testing Steps

1. Switch to Time Lens
2. Select any file with commit history
3. Verify sparkline appears in detail panel
4. Check bars vary in height across time periods
5. Drag timeline scrubber - should be responsive
6. Select a brand new file - sparkline should be absent (not empty box)

### Performance Consideration

If scrubbing feels laggy:
1. Confirm timeline cache is being used
2. Measure `buildActivityTimeline()` call frequency
3. Profile `TemporalDataProcessor.enrichFilesWithTemporal()`

Pre-computation optimization should prevent this.

---

## Phase 4: Renderer Unification

**Session:** 4  
**Estimated Duration:** 2 hours  
**Complexity:** Medium  
**Dependencies:** Phases 1-3 complete (all lenses working)

### Goal

Bring Coupling and Time lenses into the new `BaseTreemapRenderer` architecture. Eliminate `renderLegacy()` and all divergent code paths. Remove feature flag.

### Audit References

- §4.1: Two divergent debt color scales
- §4.2: Renderer system half-implemented

### Changes Required

#### 4.1 Create CouplingRenderer

**New File:** `renderers/CouplingRenderer.ts`

```typescript
export class CouplingRenderer extends BaseTreemapRenderer {
  enrichData(data: EnrichedFileData[], state: TreemapExplorerState): EnrichedFileData[] {
    return data; // Coupling data already attached in Phase 2
  }
  
  filterData(data: EnrichedFileData[], state: TreemapExplorerState): EnrichedFileData[] {
    return data; // No filter - show all files in coupling mode
  }
  
  getCellColor(file: EnrichedFileData, state: TreemapExplorerState): string {
    return getCouplingColor(file.couplingScore || 0, state.couplingThreshold || 0.03);
  }
  
  getCellOpacity(file: EnrichedFileData, state: TreemapExplorerState): number {
    if (state.selectedFile) {
      const isSelected = file.key === state.selectedFile;
      const isPartner = file.coupledFiles?.some(p => p.file === state.selectedFile);
      return (isSelected || isPartner) ? 1.0 : 0.1;
    }
    return 1.0;
  }
  
  renderExtras(svg: any, cells: any[], state: TreemapExplorerState): void {
    if (state.selectedFile && state.showArcs) {
      this.arcRenderer.render(
        state.selectedFile,
        cells,
        this.couplingIndex,
        state.couplingThreshold || 0.03
      );
    }
  }
  
  cleanup(): void {
    this.arcRenderer?.destroy();
  }
}
```

#### 4.2 Create TimeRenderer

**New File:** `renderers/TimeRenderer.ts`

```typescript
export class TimeRenderer extends BaseTreemapRenderer {
  enrichData(data: EnrichedFileData[], state: TreemapExplorerState): TemporalFileData[] {
    return TemporalDataProcessor.enrichFilesWithTemporal(
      data,
      this.temporalData,
      state.timePosition || 100
    );
  }
  
  filterData(data: TemporalFileData[], state: TreemapExplorerState): TemporalFileData[] {
    const timePosition = state.timePosition || 100;
    return data.filter(f => f.createdPosition <= timePosition);
  }
  
  getCellColor(file: TemporalFileData, state: TreemapExplorerState): string {
    return getTimeColor(file, state.timePosition || 100, state.timeFilters);
  }
  
  getCellOpacity(file: TemporalFileData, state: TreemapExplorerState): number {
    if (state.timeFilters?.fadeDormant && file.isDormant) {
      return 0.3;
    }
    return 1.0;
  }
  
  renderExtras(svg: any, cells: any[], state: TreemapExplorerState): void {
    // Future: Activity overlay from temporal_activity_map (Phase 3)
    // For now: no-op
  }
  
  cleanup(): void {
    // No resources to cleanup
  }
}
```

#### 4.3 Wire Renderers into Plugin

**File:** `TreemapExplorerPlugin.tsx`

```typescript
// Add fields
private couplingRenderer: CouplingRenderer | null = null;
private timeRenderer: TimeRenderer | null = null;

// In init()
if (USE_NEW_RENDERER_SYSTEM && this.container && this.tooltip) {
  this.debtRenderer = new DebtRenderer(this.container, this.tooltip);
  this.couplingRenderer = new CouplingRenderer(this.container, this.tooltip);
  this.timeRenderer = new TimeRenderer(this.container, this.tooltip);
}

// In getRenderer()
switch (lensMode) {
  case "debt": return this.debtRenderer;
  case "coupling": return this.couplingRenderer;
  case "time": return this.timeRenderer;
  default: return null;
}

// In cleanup()
this.debtRenderer?.cleanup();
this.couplingRenderer?.cleanup();
this.timeRenderer?.cleanup();
```

#### 4.4 Delete Legacy Code

**Deletions:**

1. **Method:** `renderLegacy()` - entire implementation
2. **Constant:** `USE_NEW_RENDERER_SYSTEM` - remove flag and conditionals
3. **Function:** `getDebtColor()` from `colorScales.ts` - redundant with `DebtRenderer.getCellColor()`
4. **Duplicate tooltips:** Plugin-level tooltip methods (now owned by BaseTreemapRenderer)

**Verification:**
```bash
grep -r "renderLegacy" src/
grep -r "USE_NEW_RENDERER" src/
grep -r "getDebtColor" src/
```

All should return zero results.

### Success Criteria

- [ ] All three lenses produce identical output before/after this phase
- [ ] `renderLegacy` is deleted - grep returns 0 results
- [ ] `USE_NEW_RENDERER_SYSTEM` is deleted - grep returns 0 results
- [ ] `getDebtColor` is deleted - grep returns 0 results
- [ ] Zero TODO comments in renderer files
- [ ] Tests passing (299/299)
- [ ] Console logs show "Using NEW renderer system" for all three lenses

### Testing Steps

1. Test Debt Lens - verify identical to before
2. Test Coupling Lens - verify arcs, colors, opacity work
3. Test Time Lens - verify timeline, fading, colors work
4. Switch between lenses rapidly - no errors
5. Run grep commands to verify deletions
6. Check console - no "LEGACY" logs

### Risk Mitigation

This is a pure structural refactor. To ensure safety:
1. Take before/after screenshots of all three lenses
2. Keep backup of `TreemapExplorerPlugin.tsx` before deletion
3. Run full test suite after each deletion
4. Verify visual parity at each step

---

## Phase 5: Cleanup & Optimization

**Session:** 5  
**Estimated Duration:** 45 minutes  
**Complexity:** Low  
**Dependencies:** Phases 1-4 complete

### Goal

Remove dead code, register missing datasets, align cache warmup with actual usage.

### Audit References

- §4.3: `temporal_monthly` not registered
- §4.4: Warmup cache targets wrong datasets
- §5.1: Legacy fallback unreachable

### Changes Required

#### 5.1 Register Missing Dataset

**File:** `services/data/DatasetRegistry.ts`

```typescript
temporal_monthly: {
  path: "/DATASETS_excalidraw/aggregations/temporal_monthly.json",
  type: "time_series",
  description: "Monthly commit activity aggregation",
  schema_version: "2.0",
  size_estimate: "~20 KB",
}
```

#### 5.2 Fix Warmup Cache

**File:** `services/data/PluginDataLoader.ts` - `warmupCache()`

**Before:**
```typescript
async warmupCache(
  commonDatasets: string[] = [
    "file_lifecycle",      // Not used by treemap
    "directory_stats",     // Not used by treemap
    "file_index",          // Used, but not fetched immediately
    "temporal_daily"       // Used
  ]
): Promise<void>
```

**After:**
```typescript
async warmupCache(
  commonDatasets: string[] = [
    "project_hierarchy",   // Treemap required
    "file_metrics_index",  // Treemap required
    "file_index",          // Treemap required (Phase 1)
    "temporal_daily"       // Treemap optional but commonly used
  ]
): Promise<void>
```

**Note:** `cochange_network` and `file_lifecycle` remain demand-loaded (16 MB + 20 MB).

#### 5.3 Remove Dead Legacy Fallback

**File:** `TreemapExplorerPlugin.tsx` - `processData()` method

Delete the entire `// LEGACY FALLBACK` branch (after the main `if` block closes). This code is unreachable because both required datasets are always registered.

Verify before deleting:
```bash
# Confirm both datasets are always registered
grep -A 5 "project_hierarchy\|file_metrics_index" src/services/data/DatasetRegistry.ts
```

#### 5.4 Check DataProcessor.enrichFiles Usage

**Before deleting:**
```bash
grep -rn "enrichFiles" src/ --include="*.ts" --include="*.tsx"
```

If only the definition remains, delete the method. If another consumer exists, keep it.

### Success Criteria

- [ ] `DatasetRegistry.getPath("temporal_monthly")` returns correct path
- [ ] On cold page load, network tab shows `project_hierarchy` and `file_metrics_index` fetching before user interaction
- [ ] `grep -rn "LEGACY FALLBACK" src/` returns 0 results
- [ ] `grep -rn "enrichFiles" src/` returns 0 results OR only the definition
- [ ] Tests passing (299/299)
- [ ] Build succeeds

### Testing Steps

1. Clear browser cache
2. Reload page
3. Check network tab - warmup datasets load immediately
4. Switch to Treemap Explorer - no additional dataset fetch needed
5. Run grep commands to verify deletions

---

## Deferred (Out of Scope)

These findings are real gaps but belong to separate initiatives:

### Display `lines_added`/`lines_deleted`/`net_change` (§3.1)

**Why deferred:** UI design decision. Where to show? How to relate to churn rate? Requires UX planning.

**Data ready:** Phase 1 makes this data available at zero cost.

**Recommendation:** Follow-up task after Phase 5.

### Backend Enrichment of `file_metrics_index`

**Why deferred:** Backend pipeline change, not frontend refactor.

**Long-term fix:** Backend should include real `operations` and optional `factors` in `file_metrics_index`, eliminating need for `file_index` as supplementary source.

**Recommendation:** Separate backend task after frontend refactoring complete.

### Heatmap Timeline Plugin Audit

**Why deferred:** Separate plugin, audited separately per session scope.

**Status:** Addressed after Treemap Explorer complete.

---

## Session Planning Guidelines

### Pre-Session Preparation

Before each session:
1. Review previous phase completion summary
2. Verify all tests passing
3. Confirm no blocking issues from previous phases
4. Read current phase plan thoroughly

### During Session

Follow this flow:
1. **Understand** - Read audit references and rationale
2. **Implement** - Make changes incrementally
3. **Verify** - Test each change before moving on
4. **Document** - Note any deviations or discoveries

### Post-Session

After each session:
1. Create phase completion summary
2. Update this plan's progress tracker
3. Commit all changes with descriptive message
4. Tag release if appropriate

### Communication Protocol

When issues arise:
1. Share exact error messages
2. Provide relevant file contents when requested
3. Test proposed fixes before marking phase complete
4. Ask clarifying questions early

---

## Rollback Strategy

### Per-Phase Rollback

Each phase has a rollback path:

**Phase 1:** Restore backup of `TreemapExplorerPlugin.tsx`  
**Phase 2:** Remove `cochange_network` requirement, revert color scale  
**Phase 3:** Remove `file_lifecycle` requirement, revert timeline methods  
**Phase 4:** Restore `renderLegacy()`, re-enable feature flag  
**Phase 5:** Restore deleted code from git history

### Full Rollback

To revert all phases:
```bash
git log --oneline --grep="Phase"  # Find phase commits
git revert <phase-5-commit>..<phase-1-commit>  # Revert in reverse order
```

---

## Success Metrics (Overall)

When all phases complete:

### Correctness
- ✅ Operations data is real (M/A/D from file_index)
- ✅ Health scores are accurate (from project_hierarchy + computed factors)
- ✅ Age factor active (dormancy penalties applied)
- ✅ Coupling index complete (full edge set, symmetric arcs)
- ✅ Time sparklines populated (per-file activity timelines)

### Code Quality
- ✅ Single render pipeline (no legacy/new split)
- ✅ No dead code (legacy fallback removed)
- ✅ No feature flags
- ✅ Consistent architecture (all lenses use renderer pattern)

### Performance
- ✅ Warmup cache optimized (correct datasets pre-loaded)
- ✅ Demand-loading for large datasets (cochange_network, file_lifecycle)
- ✅ Timeline pre-computation (no per-scrub recomputation)

### Test Coverage
- ✅ All 299 tests passing
- ✅ No regression in coverage percentage
- ✅ New tests for timeline functionality

---

## Estimated Total Effort

| Phase | Duration | Complexity |
|-------|----------|------------|
| Phase 1 | 2h | Medium |
| Phase 2 | 45min | Low |
| Phase 3 | 1.5h | Medium |
| Phase 4 | 2h | Medium |
| Phase 5 | 45min | Low |
| **Total** | **~7 hours** | **Medium** |

Spread across 5 focused sessions, this is highly achievable.

---

## Final Notes

### Why This Plan Works

1. **Incremental:** Each phase delivers value independently
2. **Verifiable:** Each phase has clear success criteria
3. **Reversible:** Each phase has a rollback strategy
4. **Documented:** Each phase produces a completion summary

### Maintaining Momentum

- One phase per session keeps scope manageable
- Clear success criteria prevent scope creep
- Documentation ensures continuity between sessions
- Tests provide safety net for bold refactoring

### When to Deviate

This plan is a guide, not a straightjacket. Deviate when:
- Audit findings were incorrect (discovered during implementation)
- Better approach emerges during coding
- Dependencies shift (e.g., dataset schema changes)

**Always:** Document deviations and update this plan accordingly.

---

**Plan Version:** 2.0  
**Last Updated:** February 2, 2026  
**Status:** Phase 1 Complete, Ready for Phase 2
