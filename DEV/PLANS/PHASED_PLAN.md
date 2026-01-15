# Git-Viz Evolution: V2.X Phased Implementation Plan

**Generated:** January 15, 2026  
**Project:** git-viz - Git Repository Visualization Platform  
**Plan Version:** 1.0.0

---

## Requirements Analysis

**Current State:**

- ✅ Plugin architecture foundation (`PluginRegistry.ts`)
- ✅ Rich V2 datasets (pre-computed, well-structured)
- ✅ One mature visualization (Timeline Heatmap)
- ❌ **Critical blocker**: Treemap is static/inactive
- ❌ Centralized data loading creates friction
- ❌ Single `appStore` will become bottleneck
- ❌ No plugin-dataset discovery mechanism

**Core Goal:**
Transform git-viz from a single-viz tool into a genuinely extensible visualization platform where adding new visualizations takes <1 hour.

**Technical Constraints:**

- No backend (static JSON serving)
- TypeScript + React + Vite stack
- Must preserve working Timeline Heatmap
- V2 datasets already generated and in place

**Assumptions to Validate:**

1. Treemap failure is due to data wiring friction (not visualization logic)
2. Plugin manifest pattern will reduce new viz time to <1 hour
3. Manifest.json can serve as dataset discovery mechanism
4. Timeline Heatmap can be refactored without functionality loss

---

## Strategic Approach

**Why This Phasing?**

1. **Phase 1-2**: Build foundation without breaking existing functionality
2. **Phase 3**: Prove pattern works by refactoring working Timeline Heatmap
3. **Phase 4**: Validate scalability by activating Treemap
4. **Phase 5**: Polish and prepare for rapid viz addition

**Main Risk Areas:**

1. **Refactoring Timeline Heatmap breaks production** → Validate via comprehensive testing
2. **Treemap still doesn't activate** → Indicates pattern needs adjustment
3. **State management migration too complex** → Time-box and rollback if needed

**Validation Strategy:**

- Each phase produces working, testable increment
- Timeline Heatmap remains functional after Phase 3 (critical validation gate)
- Treemap activation in Phase 4 proves scalability
- If any phase exceeds 2x estimated time → STOP and reassess

---

# Phase 1: Data Infrastructure Foundation (4-6 hours)

### Goal

Create plugin-aware data loading infrastructure without disrupting existing code.

### Success Criteria

- ✅ `DatasetRegistry` implemented and tested
- ✅ `PluginDataLoader` can load datasets by declaration
- ✅ All V2 datasets cataloged and accessible
- ✅ Timeline Heatmap still works (no regressions)

### Tasks

**1.1: Create DatasetRegistry** (1-2 hours)

- Create `/src/services/data/DatasetRegistry.ts`
- Catalog all V2 datasets with paths
- Add dataset metadata (type, description)
- **Key Decision**: Use static registry vs dynamic manifest parsing
  - _Recommendation_: Start static, migrate to manifest in Phase 6

```typescript
// DatasetRegistry.ts structure (not full implementation)
export class DatasetRegistry {
  private static datasets: Record<string, DatasetDefinition> = {
    temporal_daily: {
      path: "/DATASETS_excalidraw/aggregations/temporal_daily.json",
      type: "time_series",
      description: "Daily commit activity",
    },
    // ... all datasets
  };

  static getPath(datasetId: string): string | null {}
  static listAvailable(): string[] {}
  static getDefinition(datasetId: string): DatasetDefinition | null {}
}
```

**1.2: Create PluginDataLoader** (2-3 hours)

- Create `/src/services/data/PluginDataLoader.ts`
- Implement cache-aware loading
- Add error handling for missing required datasets
- Support optional plugin-specific transforms

```typescript
// PluginDataLoader.ts structure
export class PluginDataLoader {
  private cache: Map<string, any>;

  async loadForPlugin(
    requirements: PluginDataRequirement[]
  ): Promise<Record<string, any>> {
    // Implementation details during coding
  }

  clearCache(): void {}
  preloadDatasets(datasetIds: string[]): Promise<void> {}
}
```

**1.3: Add Tests** (1 hour)

- Test DatasetRegistry path resolution
- Test PluginDataLoader caching behavior
- Test handling of missing datasets

### Deliverables

- [ ] `/src/services/data/DatasetRegistry.ts` created
- [ ] `/src/services/data/PluginDataLoader.ts` created
- [ ] Basic unit tests passing
- [ ] Timeline Heatmap still renders correctly
- [ ] **README.md updated** with Phase 1 changes (new data loading infrastructure)

### Rollback Plan

**If** DataLoader conflicts with existing code: Rename new classes with `V2` suffix, use feature flag to toggle between old/new loaders.

---

# Phase 2: Enhanced Plugin Manifest (3-4 hours)

### Goal

Extend plugin architecture to support declarative data requirements.

### Success Criteria

- ✅ `PluginManifest` interface includes `dataRequirements`
- ✅ `PluginRegistry` can query plugin data needs
- ✅ Type definitions updated and validated
- ✅ No breaking changes to existing plugins

### Tasks

**2.1: Enhance Plugin Types** (1-2 hours)

- Update `/src/types/plugin.ts` with new interfaces
- Add `PluginDataRequirement` type
- Update `PluginManifest` interface
- Maintain backward compatibility

```typescript
// plugin.ts additions
export interface PluginDataRequirement {
  dataset: string;
  required: boolean;
  transform?: (raw: any) => any;
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  dataRequirements?: PluginDataRequirement[]; // Optional for backward compat
  component: React.ComponentType<PluginProps>;
}
```

**2.2: Update PluginRegistry** (1-2 hours)

- Add `getDataRequirements(pluginId)` method
- Add `validateDataAvailability(pluginId)` helper
- Update registration validation

```typescript
// PluginRegistry.ts enhancements
export class PluginRegistry {
  getDataRequirements(pluginId: string): PluginDataRequirement[] {
    // Implementation during coding
  }

  async validateDataAvailability(pluginId: string): Promise<ValidationResult> {
    // Check if all required datasets exist
  }
}
```

**2.3: Update PluginProps Interface** (30 min - 1 hour)

- Add `data` prop to PluginProps
- Update documentation
- Create example plugin template

### Deliverables

- [ ] `/src/types/plugin.ts` updated with new interfaces
- [ ] `PluginRegistry.ts` has query methods
- [ ] `/docs/PLUGIN_TEMPLATE.md` created (example for future plugins)
- [ ] TypeScript compilation succeeds with no errors
- [ ] **README.md updated** with Phase 2 changes (enhanced plugin architecture)

### Rollback Plan

**If** type changes break existing plugins: Make `dataRequirements` fully optional, provide default empty array.

---

# Phase 3: Refactor Timeline Heatmap (VALIDATION PHASE) (5-8 hours)

### Goal

**Prove the new pattern works** by migrating the working Timeline Heatmap to use declarative data loading.

### Success Criteria

- ✅ Timeline Heatmap uses new `dataRequirements` pattern
- ✅ **CRITICAL**: All existing Timeline Heatmap functionality preserved
- ✅ Data loading performance unchanged or improved
- ✅ Cell detail panel still works
- ✅ Filters and time binning still work

### Tasks

**3.1: Create Timeline Heatmap Manifest** (1-2 hours)

- Define `dataRequirements` for Timeline Heatmap
- Specify `temporal_daily` dataset dependency
- Add transform function if needed

```typescript
// TimelineHeatmapPlugin.ts additions
export const TimelineHeatmapManifest: PluginManifest = {
  id: "timeline-heatmap",
  name: "Timeline Heatmap",
  description: "Daily commit activity visualization",
  dataRequirements: [
    {
      dataset: "temporal_daily",
      required: true,
      transform: (raw) => {
        // Transform V2 schema to component needs
        return raw.days;
      },
    },
  ],
  component: TimelineHeatmapView,
};
```

**3.2: Refactor Data Loading** (2-3 hours)

- Remove direct DataLoader usage from Timeline component
- Receive data via props from plugin system
- Update component prop types
- **Key Decision**: Keep or remove local state filtering?
  - _Recommendation_: Keep filtering logic in component for now

**3.3: Wire Up Plugin System** (1-2 hours)

- Update App.tsx or plugin container to load data
- Pass loaded data to plugin via props
- Add loading states
- Add error boundaries

**3.4: Comprehensive Testing** (1-2 hours)

- Test all Timeline Heatmap features
- Test cell selection
- Test detail panel
- Test filters and date ranges
- **Performance check**: Measure load time vs baseline

### Deliverables

- [ ] Timeline Heatmap refactored to use new pattern
- [ ] All existing features work identically
- [ ] Performance is equal or better (measure and document)
- [ ] Git commit: "Phase 3: Timeline Heatmap migrated to declarative loading"
- [ ] **README.md updated** with Phase 3 changes (Timeline Heatmap now using declarative loading)

### Rollback Plan

**If** any feature breaks or performance degrades:

1. Revert git commit
2. Timeline Heatmap reverts to centralized DataLoader
3. Continue with Phase 4 using hybrid approach (old pattern for Timeline, new for Treemap)

### GO/NO-GO VALIDATION GATE

**🚨 STOP HERE if Phase 3 takes >2x estimated time or Timeline Heatmap functionality is compromised**

**PROCEED ONLY IF:**

- Timeline Heatmap works identically to before
- Loading performance is acceptable (<3 seconds for dataset)
- Team is confident pattern is sound

---

# Phase 4: Activate Treemap (SCALABILITY PROOF) (4-7 hours)

### Goal

**Prove the system scales** by activating the currently static/inactive Treemap visualization.

### Success Criteria

- ✅ Treemap renders hierarchy from `directory_stats` dataset
- ✅ User can interact with treemap (zoom, hover, select)
- ✅ Treemap has basic UI controls
- ✅ Plugin switching between Timeline and Treemap works smoothly

### Tasks

**4.1: Define Treemap Data Requirements** (1-2 hours)

- Create Treemap manifest with `dataRequirements`
- Specify `directory_stats` and optionally `file_index`
- Write transform function to build hierarchy from flat structure

```typescript
// TreemapPlugin.ts
export const TreemapManifest: PluginManifest = {
  id: "treemap-animation",
  name: "Directory Treemap",
  description: "Hierarchical repository structure",
  dataRequirements: [
    {
      dataset: "directory_stats",
      required: true,
      transform: (raw) => buildHierarchy(raw.directories),
    },
    {
      dataset: "file_index",
      required: false, // For enhanced tooltips
    },
  ],
  component: TreemapView,
};
```

**4.2: Implement Hierarchy Builder** (2-3 hours)

- Create utility to convert flat directory list to tree
- Handle path nesting (e.g., "src/components/Button.tsx")
- Calculate aggregated metrics (size = commits, color = authors)
- **Key Decision**: Use D3 hierarchy or custom structure?
  - _Recommendation_: D3.js for proven tree layouts

```typescript
// utils/hierarchyBuilder.ts
function buildHierarchy(directories: DirectoryStats[]): HierarchyNode {
  // Implementation details during coding
}
```

**4.3: Create/Fix Treemap Component** (1-2 hours)

- Implement or fix TreemapView component
- Add D3 treemap layout
- Add hover states and tooltips
- Add basic interaction (click to zoom)

**4.4: Integration and Testing** (1 hour)

- Register Treemap with PluginRegistry
- Update PluginSelector UI if needed
- Test plugin switching
- Test with different dataset sizes

### Deliverables

- [ ] Treemap renders successfully
- [ ] User can switch between Timeline and Treemap
- [ ] Treemap shows meaningful hierarchy
- [ ] Performance is acceptable (<2 seconds to render)
- [ ] Git commit: "Phase 4: Treemap activated using declarative loading"
- [ ] **README.md updated** with Phase 4 changes (Treemap visualization active, plugin pattern proven)

### Rollback Plan

**If** Treemap doesn't activate or has major issues:

1. Mark Treemap as "experimental" in UI
2. Default to Timeline Heatmap
3. Document blockers for future iteration

### SUCCESS VALIDATION

**✅ PATTERN IS PROVEN if:**

- Treemap works without touching Timeline Heatmap code
- Adding Treemap took <8 hours total
- Plugin switching is seamless
- Both visualizations coexist without conflicts

---

# Phase 5: Plugin-Scoped State Management (CONDITIONAL: 6-10 hours)

### Goal

Extract plugin-specific state from `appStore` to prevent future bottlenecks.

### Success Criteria

- ✅ Timeline Heatmap state isolated (filters, selection, zoom)
- ✅ Treemap state isolated (zoom level, selected node)
- ✅ Global appStore contains only: activePluginId, UI state
- ✅ Plugin state resets when switching plugins

### Tasks

**5.1: Create Plugin State Hook** (2-3 hours)

- Create `/src/hooks/usePluginState.ts`
- Implement state isolation per plugin
- Add automatic cleanup on plugin switch

```typescript
// usePluginState.ts
export function usePluginState<T>(
  pluginId: string,
  initialState: T
): PluginStateHook<T> {
  // Implementation details during coding
}
```

**5.2: Refactor Timeline Heatmap State** (2-4 hours)

- Extract filters, selectedCell, dateRange from appStore
- Use `usePluginState` hook
- Verify no functionality lost

**5.3: Refactor Treemap State** (1-2 hours)

- Extract zoom level, selected node
- Use `usePluginState` hook

**5.4: Clean Up appStore** (1 hour)

- Remove plugin-specific state
- Document global vs local state boundaries

### Deliverables

- [ ] `usePluginState` hook implemented and tested
- [ ] Both plugins use isolated state
- [ ] appStore.ts is <100 lines
- [ ] State resets correctly when switching plugins
- [ ] **README.md updated** with Phase 5 changes (plugin-scoped state management architecture)

### Rollback Plan

**If** state refactoring causes bugs or takes >2x time:

1. Keep hybrid approach (critical state in appStore, nice-to-have in plugins)
2. Document as "Phase 5.5" for future iteration

**CONDITIONAL PHASE:**

- **PROCEED** if Phase 4 succeeded and team has time
- **DEFER** if ahead of schedule but want to ship new viz first
- **SKIP** if Phase 4 took longer than expected

---

# Phase 6: Manifest-Driven Discovery (POLISH) (3-5 hours)

### Goal

Leverage `manifest.json` for dynamic dataset discovery and validation.

### Success Criteria

- ✅ System reads `manifest.json` on load
- ✅ DatasetRegistry validates checksums
- ✅ UI shows which datasets are available
- ✅ Error messages reference manifest for troubleshooting

### Tasks

**6.1: Manifest Parser** (1-2 hours)

- Create `/src/services/data/ManifestLoader.ts`
- Parse `manifest.json` on app initialization
- Validate dataset availability

**6.2: Integrate with DatasetRegistry** (1-2 hours)

- Update DatasetRegistry to use manifest data
- Add checksum validation (optional, log warnings only)
- Add dataset metadata to registry

**6.3: UI Enhancements** (1-2 hours)

- Show dataset status in developer console
- Add "About Data" panel showing loaded datasets
- Display dataset generation timestamp

### Deliverables

- [ ] Manifest loading working
- [ ] Datasets validated against manifest
- [ ] Optional: UI shows data provenance
- [ ] Git commit: "Phase 6: Manifest-driven dataset discovery"
- [ ] **README.md updated** with Phase 6 changes (manifest-driven dataset discovery)

### Rollback Plan

**If** manifest parsing fails: Fall back to static DatasetRegistry, log warnings about manifest unavailability.

---

# Phase 7: Third Visualization (PROOF OF VELOCITY) (2-4 hours)

### Goal

**Prove rapid development** by adding a third visualization in <4 hours.

### Success Criteria

- ✅ New visualization added start to finish in <4 hours
- ✅ Uses declarative data loading pattern
- ✅ No changes to Timeline or Treemap code
- ✅ Coexists with existing visualizations

### Suggested Third Viz Options (Pick One):

**Option A: Author Network Graph** (Recommended)

- Dataset: `author_network.json`
- Visualization: Force-directed graph (D3)
- Features: Node size = commits, edges = collaborations
- **Why**: Network data ready, visually distinct from others

**Option B: Temporal Line Chart**

- Dataset: `temporal_monthly.json`
- Visualization: Line chart (Recharts)
- Features: Show trends over time
- **Why**: Simplest to implement, complements heatmap

**Option C: File Heatmap (Churn)**

- Dataset: `file_index.json`
- Visualization: Treemap by churn
- Features: Color = authors, size = commits
- **Why**: Reuses hierarchy logic from Phase 4

### Tasks

**7.1: Choose and Plan** (30 min)

- Select visualization type
- Design data transform
- Sketch UI layout

**7.2: Implement** (2-3 hours)

- Create plugin manifest
- Write transform function
- Build visualization component
- Add to PluginRegistry

**7.3: Polish** (30 min - 1 hour)

- Add loading state
- Add empty state
- Test interactions

### Deliverables

- [ ] Third visualization working
- [ ] Takes <4 hours from start to finish
- [ ] Git commit: "Phase 7: [Viz Name] added"
- [ ] **README.md updated** with Phase 7 changes (third visualization added, system maturity demonstrated)

### SUCCESS VALIDATION

**✅ SYSTEM IS MATURE if:**

- Third viz took <4 hours
- No refactoring of existing visualizations needed
- Plugin pattern felt natural and fast
- Team is confident in adding 4th, 5th visualizations

---

## Decision Tree & Stop Conditions

```
START
  ↓
PHASE 1: Data Infrastructure (4-6h)
  ├─ Success → PHASE 2
  ├─ >12h → REASSESS COMPLEXITY
  └─ Breaks Timeline → STOP (architecture incompatible)

PHASE 2: Enhanced Manifest (3-4h)
  ├─ Success → PHASE 3
  └─ Type conflicts → PHASE 2.1: Compatibility Layer

PHASE 3: Refactor Timeline [CRITICAL GATE]
  ├─ Success + Timeline works → PHASE 4
  ├─ Success + Timeline broken → ROLLBACK Phase 3
  ├─ >16h → STOP (pattern too complex)
  └─ Failure → ROLLBACK to centralized loading

PHASE 4: Activate Treemap [SCALABILITY PROOF]
  ├─ Success → PHASE 5
  ├─ Partial success → PHASE 4.1: Simplified Treemap
  └─ Failure → REASSESS PATTERN

PHASE 5: Plugin State (CONDITIONAL)
  ├─ Time available → IMPLEMENT
  ├─ >10h → DEFER to Phase 5.5
  └─ No time → SKIP (document for later)

PHASE 6: Manifest Discovery (POLISH)
  ├─ Success → PHASE 7
  └─ Non-critical → DEFER

PHASE 7: Third Viz [VELOCITY PROOF]
  ├─ <4h → SUCCESS (system is mature)
  ├─ 4-8h → GOOD (pattern works, needs refinement)
  └─ >8h → PATTERN NEEDS IMPROVEMENT
```

### Explicit Stop Conditions

**STOP if:**

1. Phase 3 breaks Timeline Heatmap functionality
2. Any phase exceeds 2x estimated time without clear path forward
3. Phase 4 Treemap activation fails after optimization attempts
4. Phase 7 third visualization takes >8 hours (pattern not mature)
5. Memory usage increases >50% after Phase 5 (state management issues)

**REASSESS SCOPE if:**

1. Phase 1-2 combined take >12 hours (complexity underestimated)
2. Phase 3 Timeline refactor takes >12 hours (need simpler approach)
3. Plugin state management (Phase 5) causes cascading bugs

---

## Risk Mitigation Summary

| Risk                                    | Likelihood  | Impact       | Mitigation                                                               |
| --------------------------------------- | ----------- | ------------ | ------------------------------------------------------------------------ |
| Timeline Heatmap breaks during refactor | **Medium**  | **Critical** | Phase 3 has comprehensive rollback plan; git commit checkpoints          |
| Treemap still won't activate            | **Low-Med** | **High**     | Phase 4 has simplified fallback; document blockers if pattern incomplete |
| State management too complex            | **Medium**  | **Medium**   | Phase 5 is conditional and can be deferred; hybrid approach available    |
| Performance degrades                    | **Low**     | **Medium**   | Measure baseline in Phase 1; cache implementation in PluginDataLoader    |
| Type system conflicts                   | **Low**     | **Low**      | Phase 2 maintains backward compatibility; optional fields                |
| Third viz takes too long                | **Low**     | **Medium**   | Phase 7 measures maturity; if >8h, pattern needs refinement              |

---

## Success Metrics

### Minimum Viable Success (14-28 hours, 2-4 coding sessions)

- ✅ Timeline Heatmap refactored and working (Phase 3 complete)
- ✅ Treemap activated and usable (Phase 4 complete)
- ✅ Plugin data loading is declarative
- ✅ No regressions in existing functionality
- ✅ Documentation updated with plugin template

### Stretch Goals (If ahead of schedule)

- ✅ Plugin-scoped state management implemented (Phase 5)
- ✅ Manifest-driven discovery working (Phase 6)
- ✅ Third visualization added in <4 hours (Phase 7)
- ✅ Error boundaries for plugin isolation
- ✅ URL state for plugin selection

---

## Scope Boundaries

### In Scope

- ✅ Declarative plugin data requirements
- ✅ Plugin-aware data loading infrastructure
- ✅ Activating Treemap visualization
- ✅ Refactoring Timeline Heatmap without functionality loss
- ✅ Basic plugin state management
- ✅ Manifest.json integration
- ✅ README.md updates at each phase

### Out of Scope

- ❌ Backend API or live Git data (remains static JSON)
- ❌ Plugin lazy loading (defer to Phase 8+)
- ❌ Cross-plugin communication
- ❌ Plugin versioning system
- ❌ User-installable plugins
- ❌ Data caching persistence (localStorage)
- ❌ Advanced visualizations beyond proof of concept (network layouts, advanced treemaps)
- ❌ Export/sharing features
- ❌ Authentication or multi-user features

---

## Next Steps

### Immediate Actions

1. **Create git branch**: `feature/plugin-data-refactor`
2. **Set up Phase 1 directory**: `/src/services/data/`
3. **Review V2 dataset locations**: Verify all paths in `DatasetRegistry`
4. **Document baseline**: Measure Timeline Heatmap load time and bundle size

### First Validation Checkpoint (After Phase 2)

- Schedule 30-minute review
- Demo: Show plugin manifest pattern in code
- Verify: TypeScript types compile without errors
- Decide: Proceed to Phase 3 or adjust approach

### Recommended Commit Strategy

```
Phase 1: feat: add DatasetRegistry and PluginDataLoader
Phase 2: feat: enhance PluginManifest with dataRequirements
Phase 3: refactor: migrate Timeline Heatmap to declarative loading
Phase 4: feat: activate Treemap visualization
Phase 5: refactor: extract plugin-scoped state management
Phase 6: feat: add manifest-driven dataset discovery
Phase 7: feat: add [Third Viz Name] visualization
```

---

## README.md Update Guidelines

At the end of each phase, update `README.md` to reflect:

1. **Phase 1**: New data loading infrastructure (DatasetRegistry, PluginDataLoader)
2. **Phase 2**: Enhanced plugin architecture with declarative data requirements
3. **Phase 3**: Timeline Heatmap now using declarative loading pattern
4. **Phase 4**: Treemap visualization active, plugin pattern proven
5. **Phase 5**: Plugin-scoped state management architecture (if completed)
6. **Phase 6**: Manifest-driven dataset discovery (if completed)
7. **Phase 7**: Third visualization added, system maturity demonstrated (if completed)

**Format for each update:**

- Brief bullet points in "Recent Changes" or "Development Status" section
- Update feature list if new visualizations added
- Update architecture diagram if available
- Keep it concise (2-4 sentences per phase)

**Why update at each phase:**

- Project may stop at any intermediate phase
- Documentation reflects actual state, not aspirational roadmap
- Future contributors can understand what was completed
- Enables picking up work after breaks

---

## Questions Before Starting

1. **Timeline Heatmap Criticality**: Are there any Timeline Heatmap features that are absolutely untouchable during Phase 3 refactor? (This helps set rollback criteria)

2. **Treemap Context**: Why is the Treemap currently static/inactive? Is it incomplete code or a data wiring issue? (This helps scope Phase 4)

3. **State Management Priority**: How important is Phase 5 (plugin state isolation) vs shipping more visualizations? (Helps decide conditional phase)

4. **Third Viz Preference**: For Phase 7, which visualization would be most valuable? (Author network, temporal line chart, or file churn heatmap?)

---

**This phased plan transforms git-viz from a single-viz tool into an extensible platform in 14-35 hours of focused work, with validation gates ensuring no breaking changes, rollback points at every phase, and README.md updates to document progress at each stage.**
