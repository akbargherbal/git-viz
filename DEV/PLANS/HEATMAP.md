I have gathered all the necessary information to proceed with the impact analysis.

**Summary of Findings:**

1.  **`MetricSelector.tsx`**: Explicitly defines options for "Commits", "Events", and "Authors". This is the primary target for modification.
2.  **`domain.ts`**: Defines `MetricType` as `"commits" | "events" | "authors" | "lines"`. This needs to be updated.
3.  **`TimelineHeatmapPlugin.ts`**:
    - Uses `metric` in its state and config.
    - Defaults to `"events"`.
    - Has logic to switch color schemes based on the metric.
    - Has logic to calculate cell values based on the metric.
    - Renders the `MetricSelector`.
4.  **`TreemapExplorerPlugin`**:
    - Uses `sizeMetric` in its state (`TreemapExplorerState`).
    - `TreemapExplorerControls.tsx` has its own local definition of metrics: "Commits" and "Authors". It does _not_ use the shared `MetricSelector`.
    - `BaseTreemapRenderer.ts` uses `sizeMetric` to calculate node sizes (`getSizeValue`). It supports "commits", "authors", and "events".
    - E2E tests (`treemap-explorer-new.spec.ts`) explicitly test switching size metrics to "events".
5.  **Tests**:
    - `TimelineHeatmapPlugin.test.ts` tests the default state (which is "events") and metric switching.
    - `treemap-explorer-new.spec.ts` tests switching size metrics.

**Impact Analysis:**

- **Simplification**: Removing "Authors" and "Events" from `MetricSelector` will simplify the UI for the Timeline Heatmap.
- **Timeline Heatmap**: This plugin relies heavily on the `metric` to determine what to show (events vs commits vs authors). If we remove these options, we need to decide if the plugin should _only_ show commits, or if it should still support the other metrics internally but just not expose them via the selector. The request says "remove the other two options... keeping only the default Commit option". This implies the Timeline Heatmap should now primarily visualize Commits.
  - _Correction_: The Timeline Heatmap's _default_ is currently "events". I will need to change the default to "commits".
- **Treemap Explorer**: The `TreemapExplorerControls` has its _own_ selector for "Size Metric" (Commits vs Authors). The request specifically mentions "simplifying the MetricSelector". It's ambiguous if this applies to the Treemap's _Size Metric_ selector as well. However, the user said "Currently, switching between the three options does not provide any meaningful insight...". The `MetricSelector` component has 3 options. The Treemap controls only have 2 ("Commits", "Authors"). This strongly suggests the user is talking about the global/shared `MetricSelector` used by the Timeline Heatmap (or the app header if used there).
  - _Decision_: I will focus on the shared `MetricSelector` and the `TimelineHeatmapPlugin` which uses it. I will _not_ remove the "Authors" option from the Treemap Explorer's _Size Metric_ selector unless explicitly asked, as that serves a different purpose (sizing boxes vs coloring heatmap cells). _However_, the `MetricType` in `domain.ts` is shared. If I remove "authors" from `MetricType`, it might break `TreemapExplorerState` if it imports `MetricType`.
  - _Check_: `TreemapExplorerState` in `types.ts` defines `sizeMetric: "commits" | "authors" | "events";` inline, it does _not_ seem to use `MetricType` directly, but I should verify if it aligns.
  - _Refinement_: The user said "remove the other two options (Author and Events)". This likely refers to the `MetricSelector` component.

**Plan:**

1.  **Modify `MetricSelector.tsx`**: Remove "Events" and "Authors" options.
2.  **Modify `domain.ts`**: Remove "events" and "authors" from `MetricType`.
3.  **Update `TimelineHeatmapPlugin.ts`**:
    - Change default metric to "commits".
    - Remove logic for "events" and "authors" in `processData` and `render` (or simplify it).
    - Remove `MetricSelector` usage if it only has one option (or keep it as a single indicator). _Actually, if there's only one option, a selector is useless._ I should probably remove the selector control entirely from the plugin controls if it's fixed to "Commits".
4.  **Update `TimelineHeatmapPlugin.test.ts`**: Update tests to expect "commits" as default and remove tests for other metrics.
5.  **Check Treemap Explorer**: Ensure `TreemapExplorerState` doesn't break if it relies on `MetricType`. (It seems to define its own union type, so it should be fine, but I'll double check).
6.  **Update `appStore.ts`**: Default `metric` in filter state should be "commits".

**Wait**, if I remove "events" and "authors" from `MetricType`, I need to make sure `TreemapExplorer` doesn't use `MetricType` for its `sizeMetric`.
`src/plugins/treemap-explorer/types.ts`: `sizeMetric: "commits" | "authors" | "events";` -> It's defined inline. So modifying `MetricType` won't break the _type_ definition in Treemap, but I should check if `MetricType` is used elsewhere.

Let's verify if `TreemapExplorer` uses `MetricType` anywhere.
`src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx` imports `MetricType`? No, I didn't see it in the grep.

**Refined Plan:**

1.  **Modify `MetricSelector.tsx`**: Remove the options. Since it will only have "Commits", it effectively becomes a label.
2.  **Update `domain.ts`**: Update `MetricType` to just `"commits"`. (Or keep it as is if we want to avoid breaking other things, but "cleanly" implies removing unused types).
3.  **Update `appStore.ts`**: Set default to "commits".
4.  **Update `TimelineHeatmapPlugin.ts`**:
    - Default to "commits".
    - Remove the `MetricSelector` from `renderControls` (why select if only 1 option?).
    - Simplify `processData` to only calculate/return commit data (or keep the logic but hardcode the metric).
5.  **Update Tests**: Fix `TimelineHeatmapPlugin.test.ts`.

I'll start by creating the impact analysis document.

```markdown
# Impact Analysis: Simplifying MetricSelector

## Goal

Remove "Authors" and "Events" options from the `MetricSelector`, keeping only "Commits".

## Affected Components

### 1. `src/components/common/MetricSelector.tsx`

- **Current**: Renders buttons for "Commits", "Events", "Authors".
- **Change**: Remove "Events" and "Authors".
- **Impact**: Component will only show one button. We should consider if this component is still needed or if it should be replaced by a static label in the UI.

### 2. `src/types/domain.ts`

- **Current**: `export type MetricType = "commits" | "events" | "authors" | "lines";`
- **Change**: Remove "events", "authors", "lines".
- **Impact**: Strong typing will prevent accidental usage of removed metrics.

### 3. `src/store/appStore.ts`

- **Current**: `filters.metric` defaults to `"commits"` (actually it defaults to "commits" in store, but TimelineHeatmap defaults to "events").
- **Change**: Ensure default is "commits". Remove logic for other metrics if present.

### 4. `src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts`

- **Current**:
  - Defaults to `metric: "events"`.
  - Renders `MetricSelector` in `renderControls`.
  - `processData` calculates values based on `metric`.
  - `render` chooses color hue based on `metric`.
- **Change**:
  - Change default to `"commits"`.
  - Remove `MetricSelector` from controls (no choice needed).
  - Simplify `processData` to focus on commits.
  - Simplify `render` to use the commit color scheme (Blue/Hue 210) permanently.

### 5. `src/plugins/treemap-explorer`

- **Analysis**:
  - `TreemapExplorerControls` has its own "Size Metric" selector ("Commits", "Authors").
  - `TreemapExplorerState` defines `sizeMetric` inline.
  - **Decision**: The user request specifically targets the `MetricSelector` (which has 3 options). The Treemap's size selector serves a different purpose (sizing vs coloring). However, to be "clean", we should check if the user wants _all_ metric selections simplified. Given the phrasing "switching between the three options", it clearly refers to the `MetricSelector` component. I will leave Treemap's _Size Metric_ alone unless it relies on the shared `MetricType`.

## Test Impact

### 1. `src/plugins/timeline-heatmap/__tests__/TimelineHeatmapPlugin.test.ts`

- Needs update to expect "commits" default.
- Remove tests for "events" and "authors" metric switching.

### 2. E2E Tests

- `tests/e2e/specs/treemap-explorer-new.spec.ts` tests `switchSizeMetric('events')`.
- **Conflict**: The Treemap Explorer _does_ support "events" as a size metric (via `lifecycle_event_count`).
- **Resolution**: If I remove "events" from `MetricType` in `domain.ts`, does Treemap use it?
  - `BaseTreemapRenderer.ts` uses string literals in `getSizeValue`.
  - `types.ts` defines `sizeMetric` inline.
  - **Conclusion**: Treemap is decoupled from `MetricType`. It is safe to modify `MetricType` without breaking Treemap _types_, but we should ensure we don't accidentally break shared logic.

## Execution Steps

1.  **Update `domain.ts`**: Redefine `MetricType`.
2.  **Update `MetricSelector.tsx`**: Remove options.
3.  **Update `TimelineHeatmapPlugin.ts`**: Hardcode to commits, remove selector.
4.  **Update `TimelineHeatmapPlugin.test.ts`**: Fix tests.
5.  **Verify**: Run tests.
```

I will now generate the response.

One final check: `MetricSelector` is used in `TimelineHeatmapPlugin.ts`. If I remove the options from `MetricSelector`, I should also remove the usage of `MetricSelector` in `TimelineHeatmapPlugin` because a selector with one option is bad UX.

Wait, `MetricSelector` is also used in `App.tsx`?
No, `App.tsx` imports it but I don't see it rendered in the `App` component in the file content I read. It seems `App.tsx` renders `PluginSelector` and `FilterPanel`. `MetricSelector` is likely only used within plugins now (specifically TimelineHeatmap).

Let's double check `App.tsx` imports.
`import { MetricSelector } from "@/components/common/MetricSelector";` -> I don't see this import in `App.tsx` in the file content provided.
Ah, I see `import { FilterPanel } from "@/components/common/FilterPanel";`.

Okay, `MetricSelector` seems to be used _only_ by `TimelineHeatmapPlugin` (and potentially others I haven't seen, but `grep` only showed TimelineHeatmap).

If `TimelineHeatmapPlugin` is the only user, and we are removing the choice, we can probably delete `MetricSelector.tsx` entirely if we want to be really clean, or just deprecate it. But the user said "simplify... removing the other two options". I will modify it first.

Actually, if I remove the selector from `TimelineHeatmapPlugin`, then `MetricSelector` might become unused code.
`grep -r "MetricSelector" src` showed:
`src/components/common/MetricSelector.tsx`
`src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts`

So yes, if I remove it from the plugin, the component becomes an orphan. I should probably delete the component `MetricSelector.tsx` entirely to be "clean", as requested.

**Revised Plan:**

1.  **Update `domain.ts`**: Remove unused metric types.
2.  **Update `TimelineHeatmapPlugin.ts`**:
    - Remove `MetricSelector` import and usage.
    - Hardcode logic to "commits".
3.  **Delete `MetricSelector.tsx`**.
4.  **Update `appStore.ts`**: Remove `metric` and `setMetric` from `filters` if it's no longer used globally.
    - `filters.metric` is in `AppState`. Is it used anywhere else?
    - `App.tsx` passes `metric: filters.metric` to `activePlugin.render`.
    - If plugins no longer use the global `metric` (TimelineHeatmap was likely the main user), we might be able to remove it from the store too.
    - `TreemapExplorer` uses its own internal state for `sizeMetric`.
    - So `filters.metric` in `appStore` might be legacy or specific to TimelineHeatmap.
    - I'll check if `App.tsx` uses `filters.metric` for anything else.
    - `App.tsx`: `const config = { ..., metric: filters.metric, ... }`.
    - If I remove it from the store, I need to update `App.tsx`.

This seems like a proper cleanup.

**Step 1: Update `domain.ts`**
**Step 2: Update `appStore.ts`** (Remove metric)
**Step 3: Update `App.tsx`** (Remove metric from config passing)
**Step 4: Update `TimelineHeatmapPlugin.ts`** (Remove selector, hardcode commits)
**Step 5: Delete `MetricSelector.tsx`**
**Step 6: Update Tests**

Wait, `MetricSelector` supports "controlled" mode.
`interface ControlledMetricSelectorProps`.
If I delete it, I need to make sure no one else uses it. `grep` confirmed only TimelineHeatmap.

Okay, I'm ready. I will present the impact analysis first.

One detail: `TreemapExplorer` uses `sizeMetric` in its state. It is _not_ connected to `filters.metric` in the store (it uses `pluginStates`). So removing `filters.metric` from the store is safe for Treemap.

I will provide the code changes now.

Wait, I should probably keep `MetricType` in `domain.ts` but just reduce it to `type MetricType = "commits"`. This minimizes refactoring noise in case other things import the _type_ even if they don't use the values.

Actually, `TreemapExplorer` uses `sizeMetric` which has values "commits" | "authors" | "events". If I change `MetricType` in `domain.ts` to only "commits", and if Treemap imports `MetricType` (it doesn't seem to, but let's be safe), it might be fine.
But `TimelineHeatmapPlugin` imports `MetricType`.

I'll start with the Impact Analysis.
