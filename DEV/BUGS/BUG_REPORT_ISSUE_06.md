### Bug Report: Plugin Transition State Mismatch (Race Condition)

**Status:** Confirmed
**Severity:** High (Application Crash)
**Location:** `src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts` & `src/App.tsx`

---

#### 1. Symptom

When switching from **Treemap Explorer** to **Timeline Heatmap**, the application crashes with:
`TypeError: Cannot read properties of undefined (reading 'forEach')` at `TimelineHeatmapPlugin.render (TimelineHeatmapPlugin.ts:603:19)`.

#### 2. Root Cause Analysis

The crash is caused by a **state synchronization race condition** in `App.tsx`.

1. **State Decoupling:** `App.tsx` manages `activePlugin` (the class instance) and `processedPluginData` (the result of `processData`) as independent state variables.
2. **The Switch:** When a user selects a new plugin:
   - `activePlugin` is updated immediately to the new plugin instance.
   - This triggers the "Render Effect" in `App.tsx` because `activePlugin` is a dependency.
3. **The Mismatch:** For exactly one render cycle, the `activePlugin` is the **Timeline Heatmap**, but `processedPluginData` still contains the data from the **Treemap Explorer**.
4. **Data Contract Violation:**
   - **Treemap Explorer** produces an **Array** (`EnrichedFileData[]`).
   - **Timeline Heatmap** produces an **Object** (`HeatmapData` with `cells`, `directories`, etc.).
5. **The Crash:** `TimelineHeatmapPlugin.render` receives the Treemap Array. It attempts to access `data.directories.forEach(...)`. Since `data` is an Array, `data.directories` is `undefined`, leading to the `TypeError`.

#### 3. Evidence

- **Stack Trace:** Points to line 603 in `TimelineHeatmapPlugin.ts`, which is the start of the `data.directories.forEach` loop in the `render` method.
- **Console Logs:** Show `[TreemapExplorer] Received invalid data format` followed by the Timeline Heatmap error. This confirms the Treemap plugin also received the wrong data format during the transition but handled it gracefully via an existing guard.
- **Code Inspection:** `TreemapExplorerPlugin.tsx` contains a guard: `if (!Array.isArray(data)) return;`. `TimelineHeatmapPlugin.ts` lacks a corresponding guard for its object-based structure.

#### 4. Reproduction Steps

1. Load the application (defaults to Timeline Heatmap).
2. Switch to **Treemap Explorer** (works correctly).
3. Switch back to **Timeline Heatmap**.
4. Application crashes immediately.

#### 5. Proposed Resolution Strategy

**A. Defensive (Immediate Fix):**
Add a structural validation guard at the beginning of `TimelineHeatmapPlugin.render`. It must verify that `data` contains the expected `directories` and `cells` properties before proceeding.

**B. Architectural (Robust Fix):**
Modify `App.tsx` to ensure `processedPluginData` is either:

1. Cleared immediately when `activePlugin` changes (resetting the state).
2. Validated against the `activePlugin.metadata.id` before being passed to the `render` method.
3. Wrapped in a single state object (e.g., `visualizationState: { id: string, data: any }`) to ensure the plugin and its data are always "in sync."

---

**Hypothesis Status:** VERIFIED
**Next Action:** Implement defensive guards in `TimelineHeatmapPlugin.ts` and refine the lifecycle synchronization in `App.tsx`.
