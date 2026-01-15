# git-viz 2.x: Plugin Architecture Evolution - Implementation Plan

## Executive Summary

**Current State**: Single-visualization platform with hardcoded control layer in App.tsx. Timeline Heatmap plugin is feature-complete. Treemap plugin exists but shares universal controls not suited for all visualizations.

**Goal**: Transform into a scalable multi-visualization platform where plugins own their controls and layout, enabling rapid addition of new visualizations without App.tsx modification.

**Key Architectural Decision**: Shift control responsibility from App.tsx (universal) to plugins (context-specific), keeping only dataset/plugin selection at app level. This mirrors the existing data layer separation success - plugins should be as decoupled as the DatasetRegistry/PluginDataLoader.

**Estimated Time**: 6-9 hours (1-2 coding sessions)

---

## Phase 1: Plugin Interface Extension (2-3 hours)

### Goal
**Extend the plugin interface to support self-contained controls and state management without breaking existing plugins.**

### Success Criteria
- ✅ Plugin interface includes `renderControls`, `getInitialState`, `layoutConfig` (all optional)
- ✅ Store has `pluginStates` management with `setPluginState` action
- ✅ Existing plugins continue working (backward compatibility)
- ✅ TypeScript compilation passes with no errors

### Tasks

**1.1: Extend Plugin Interface** (1 hour)
- Add optional methods to `src/types/plugin.ts`:
  - `renderControls?: (props: PluginControlProps) => React.ReactNode`
  - `getInitialState?: () => Record<string, unknown>`
  - `layoutConfig?: { controlsPosition: 'header' | 'sidebar' | 'bottom'; }`
- Create `PluginControlProps` interface:
  ```typescript
  interface PluginControlProps {
    state: Record<string, unknown>;
    updateState: (updates: Record<string, unknown>) => void;
    data: ProcessedDataset;
  }
  ```
- **Key Decision**: Make all new fields optional to maintain backward compatibility

**1.2: Add Plugin State Management to Store** (45 mins)
- Update `src/store/appStore.ts`:
  ```typescript
  interface AppState {
    // ... existing fields ...
    pluginStates: Record<string, Record<string, unknown>>;
    setPluginState: (pluginId: string, updates: Record<string, unknown>) => void;
  }
  ```
- Implement state slice merging logic
- Add state initialization when plugin switches

**1.3: Update App.tsx for Dual Mode** (45 mins)
- Detect if plugin implements `renderControls`
- If yes: render plugin controls, pass plugin state
- If no: render existing universal controls (backward compat)
- Structure example:
  ```typescript
  const pluginState = pluginStates[plugin.id] || plugin.getInitialState?.() || {};
  
  // Plugin controls if available
  {plugin.renderControls && (
    <div className="plugin-controls">
      {plugin.renderControls({ state: pluginState, updateState, data })}
    </div>
  )}
  
  // Fallback to universal controls for old plugins
  {!plugin.renderControls && (
    <div className="universal-controls">
      <MetricSelector ... />
      <TimeBinSelector ... />
      <FilterPanel ... />
    </div>
  )}
  ```

### Deliverables
- [ ] `src/types/plugin.ts` updated with new optional interfaces
- [ ] `src/store/appStore.ts` includes `pluginStates` management
- [ ] `src/App.tsx` supports both old and new plugin patterns
- [ ] Unit tests for `appStore.setPluginState` logic
- [ ] Existing timeline heatmap still renders and functions

### Rollback Plan
**If** tests fail or plugins break: Revert `plugin.ts` interface changes, keep store changes (harmless). Continue with Phase 2 only after interface stabilizes.

---

## Phase 2: Migrate Timeline Heatmap Plugin (2 hours)

### Goal
**Convert TimelineHeatmapPlugin to use new control ownership pattern, proving the architecture works for a complex plugin.**

### Success Criteria
- ✅ TimelineHeatmapPlugin implements `renderControls` and `getInitialState`
- ✅ All existing heatmap functionality works identically to before
- ✅ No heatmap-specific code remains in App.tsx
- ✅ Plugin state persists when switching between plugins and back

### Tasks

**2.1: Extract Current State Shape** (15 mins)
- Document current App.tsx state used by heatmap:
  - `metric: 'commits' | 'events' | 'authors'`
  - `timeBin: 'day' | 'week' | 'month'`
  - `selectedAuthors: string[]`
  - `selectedExtensions: string[]`
- Create TypeScript interface for heatmap state

**2.2: Implement getInitialState** (15 mins)
- Add method to `TimelineHeatmapPlugin.ts`:
  ```typescript
  getInitialState: () => ({
    metric: 'commits' as const,
    timeBin: 'day' as const,
    selectedAuthors: [] as string[],
    selectedExtensions: [] as string[],
  })
  ```

**2.3: Implement renderControls** (1 hour)
- Move MetricSelector, TimeBinSelector, FilterPanel into plugin
- Wire up state via `updateState` callback
- Handle data availability for FilterPanel (authors/extensions from metadata)
- Structure:
  ```typescript
  renderControls: ({ state, updateState, data }) => (
    <div className="flex gap-4 items-center">
      <MetricSelector 
        value={state.metric}
        onChange={(metric) => updateState({ metric })}
      />
      <TimeBinSelector
        value={state.timeBin}
        onChange={(timeBin) => updateState({ timeBin })}
      />
      <FilterPanel
        authors={data.metadata?.authors || []}
        extensions={data.metadata?.extensions || []}
        selectedAuthors={state.selectedAuthors}
        selectedExtensions={state.selectedExtensions}
        onAuthorsChange={(authors) => updateState({ selectedAuthors: authors })}
        onExtensionsChange={(ext) => updateState({ selectedExtensions: ext })}
      />
    </div>
  )
  ```

**2.4: Update render Method to Use Plugin State** (30 mins)
- Change `render` signature to accept `state` in props
- Replace any App.tsx state references with `props.state`
- Verify all filtering/aggregation logic uses plugin state

### Deliverables
- [ ] `TimelineHeatmapPlugin.ts` implements all new methods
- [ ] Control components moved from App.tsx or imported directly
- [ ] Manual testing checklist complete:
  - [ ] Metric switching works
  - [ ] Time bin switching works
  - [ ] Author filtering works
  - [ ] Extension filtering works
  - [ ] State persists when switching away and back
- [ ] Visual output identical to pre-refactor version

### Rollback Plan
**If** heatmap breaks or functionality differs: Keep new plugin code but add compatibility wrapper in App.tsx that translates old props to new state shape. Fix issues before Phase 3.

---

## Phase 3: Clean Up App.tsx & Remove Old Code (1-1.5 hours)

### Goal
**Remove universal control logic from App.tsx now that timeline heatmap is self-contained, leaving only app-level concerns.**

### Success Criteria
- ✅ App.tsx is <80 lines (excluding imports)
- ✅ No metric/timeBin/filter state in App.tsx
- ✅ Only dataset selection and plugin selection remain as universal controls
- ✅ All plugins still work (timeline heatmap via new pattern, treemap gracefully degrades or gets migrated)

### Tasks

**3.1: Remove Universal Control State** (30 mins)
- Delete from App.tsx state:
  - `metric` state and setter
  - `timeBin` state and setter
  - `selectedAuthors` state and setter
  - `selectedExtensions` state and setter
- Remove control component imports if unused

**3.2: Simplify App.tsx Render Logic** (30 mins)
- Remove conditional "if heatmap show these controls" logic
- Structure becomes:
  ```typescript
  <header>
    <DatasetSelector />  {/* Universal */}
    <PluginSelector />   {/* Universal */}
    
    {plugin?.renderControls && data && (
      <div className="plugin-controls-container">
        {plugin.renderControls({ state, updateState, data })}
      </div>
    )}
  </header>
  ```

**3.3: Migrate or Deprecate TreemapPlugin** (30 mins, CONDITIONAL)
- **Option A**: Treemap needs no controls → mark it complete
- **Option B**: Treemap needs controls → quick-migrate using Phase 2 pattern
- **Option C**: Treemap is experimental → document "migration needed" and skip

### Deliverables
- [ ] App.tsx reduced to app-level concerns only
- [ ] Git diff shows net deletion of >50 lines from App.tsx
- [ ] All control components either in plugin code or in `/components/common/` (shared)
- [ ] Both plugins functional in production build

### Rollback Plan
**If** removing code breaks unknown dependencies: Re-add minimal universal controls as fallback, document as tech debt for Phase 4.

---

## Phase 4: Add Layout Configuration Support (1-2 hours, OPTIONAL)

### Goal
**Enable plugins to customize their layout (header vs sidebar vs bottom controls) for visualizations that need different UI patterns.**

### Success Criteria
- ✅ Plugins can specify `layoutConfig.controlsPosition`
- ✅ App.tsx renders 3 layout modes: header, sidebar, bottom
- ✅ Timeline heatmap uses header layout (current default)
- ✅ No regression in existing functionality

### Tasks

**4.1: Implement Layout Rendering Logic** (1 hour)
- Add layout switch to App.tsx:
  ```typescript
  const layout = plugin?.layoutConfig?.controlsPosition || 'header';
  
  if (layout === 'sidebar') {
    return (
      <div className="flex h-screen">
        <aside className="w-80 border-r overflow-y-auto">
          <AppControls />
          {controls}
        </aside>
        <main className="flex-1">{visualization}</main>
      </div>
    );
  }
  // ... header and bottom layouts
  ```

**4.2: Update Timeline Heatmap to Specify Layout** (15 mins)
- Add explicit layout config (documents intent):
  ```typescript
  layoutConfig: {
    controlsPosition: 'header'
  }
  ```

**4.3: Document Layout API** (15 mins)
- Add comment in `plugin.ts` showing layout options
- Include example of when to use each layout

### Deliverables
- [ ] App.tsx supports 3 layout modes
- [ ] Existing plugins specify their preferred layout
- [ ] Tailwind CSS handles responsive layout properly
- [ ] Manual test: switch layouts, verify no overflow/scroll issues

### Rollback Plan
**If** layout system causes UI bugs: Set all plugins to 'header' layout as default, defer custom layouts to future work.

---

## Decision Tree & Stop Conditions

```
START
  ↓
PHASE 1: Plugin Interface Extension
  ├─ Tests pass, plugins compatible → PHASE 2
  ├─ TypeScript errors → Fix types before continuing
  └─ Existing plugins break → STOP, reassess interface design

PHASE 2: Migrate Timeline Heatmap
  ├─ Functionality identical → PHASE 3
  ├─ Minor bugs → Fix before Phase 3
  └─ Major regressions → STOP, keep dual-mode support in App.tsx

PHASE 3: Clean Up App.tsx
  ├─ App.tsx <80 lines, plugins work → PHASE 4 or DONE
  ├─ Hidden dependencies found → Document as tech debt, DONE
  └─ Critical breakage → ROLLBACK Phase 3, DONE at Phase 2

PHASE 4: Layout Configuration (OPTIONAL)
  ├─ Layouts work → DONE
  └─ UI issues → Revert to header-only, DONE
```

### Explicit Stop Conditions

**STOP if:**
- Phase 1 breaks existing plugins AND fix requires >4 hours
- Phase 2 migration produces different visual output (not just code structure)
- Phase 3 reveals architectural coupling that wasn't visible (e.g., shared state between unrelated components)
- Any phase exceeds 2x estimated time

---

## Risk Mitigation Summary

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Backward compatibility breaks | Medium | High | Make all new plugin methods optional; keep dual-mode support in Phase 1 |
| State persistence bugs | Medium | Medium | Thorough testing in Phase 2; add state serialization tests |
| Timeline heatmap regression | Low | High | Comprehensive manual testing checklist; visual diff screenshots |
| Unknown coupling in App.tsx | Medium | Medium | Incremental deletion in Phase 3; keep git commits small |
| Layout system complexity | Low | Low | Defer Phase 4 if other phases struggle; header-only is fine |

---

## Success Metrics

### Minimum Viable Success (6 hours)
- ✅ Timeline heatmap owns its controls
- ✅ App.tsx handles universal concerns only
- ✅ Plugin state managed by store
- ✅ No regressions in existing functionality

### Stretch Goals (If ahead of schedule)
- Layout configuration system (Phase 4)
- Migrate TreemapPlugin to new pattern
- Add plugin state persistence to localStorage
- Create plugin developer documentation

---

## Scope Boundaries

### In Scope
- ✅ Plugin control ownership via `renderControls`
- ✅ Plugin state management in store
- ✅ Timeline Heatmap migration to new pattern
- ✅ App.tsx simplification
- ✅ Optional layout configuration system
- ✅ Backward compatibility for existing plugins

### Out of Scope
- ❌ New visualizations (focus is architecture, not features)
- ❌ Control composition utilities (premature - wait for 3+ plugins)
- ❌ Shared state between plugins (YAGNI - no use case yet)
- ❌ Plugin marketplace/discovery (way too early)
- ❌ Advanced data transformations (data layer is working well)
- ❌ Performance optimization (not a current bottleneck)

---

## Next Steps

1. **Create feature branch**: `git checkout -b feature/plugin-control-ownership`
2. **Start with Phase 1.1**: Update `src/types/plugin.ts` interface
3. **Commit boundaries**: One commit per task (1.1, 1.2, 1.3, 2.1, etc.)
4. **Test after each phase**: Don't proceed to next phase with failing tests
5. **Screenshot before/after**: Visual regression testing for heatmap

**Preparation before starting:**
- Review current App.tsx control flow (map out state dependencies)
- Identify all places timeline heatmap state is read/written
- Set up side-by-side browser windows for before/after comparison

---

## Implementation Notes

### Technologies Requiring Research
- None (all patterns use existing tech stack)

### Potential Blockers
- **Hidden state coupling**: If App.tsx state is used by multiple components in unexpected ways, Phase 3 cleanup may require more investigation
- **Type inference issues**: Zustand store with dynamic plugin state keys may need explicit typing
- **Render prop performance**: If `renderControls` causes re-render loops, may need React.memo optimization

### Recommended Starting Point
**Start here**: `src/types/plugin.ts` - Add the new optional methods to the `Plugin` interface. This is the foundation everything else builds on. Run `npm run type-check` after each change to catch issues early.