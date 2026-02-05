### **Context: Timeline Heatmap Filter Redesign**

**Goal:**
Replace the generic, irrelevant `FilterPanel` (Authors/File Types) in the `TimelineHeatmapPlugin` with a dedicated, domain-specific `TimelineHeatmapFilters` component.

**The Problem:**
The current heatmap shows the top 20 directories by default with no way to change this number or exclude specific directories (e.g., `node_modules`, `dist`, `docs`) that might clutter the view.

**Target Features:**
1.  **Directory Exclusion:** A UI to toggle specific directories off.
2.  **Row Count Control:** A slider/input to adjust the number of directories displayed (default 20, configurable).
3.  **Renaming:** The panel should be explicitly named `TimelineHeatmapFilters`.

**Technical Plan (Ready to Execute):**

*   **Phase 1: State & Logic**
    *   Update `TimelineHeatmapState` in `TimelineHeatmapPlugin.ts` to include `excludedDirectories: string[]` and `directoryCount: number`.
    *   Modify `processData` to filter the directory list based on these new state fields *before* generating the heatmap grid.

*   **Phase 2: Component Implementation**
    *   Create `src/plugins/timeline-heatmap/components/TimelineHeatmapFilters.tsx`.
    *   Implement a "Top Directories" list with checkboxes for exclusion.
    *   Implement a slider for "Number of Directories".

*   **Phase 3: Integration**
    *   Update `TimelineHeatmapPlugin.ts` to use the new component in `renderFilters`.
    *   Remove the dependency on the generic `FilterPanel`.

**Key Files:**
*   `src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts` (Logic & Integration)
*   `src/plugins/timeline-heatmap/components/TimelineHeatmapFilters.tsx` (New Component)

**Status:**
Impact analysis is complete. We have verified that the plugin has access to `directory_stats` in the metadata, which is required to populate the exclusion list. We are ready to start coding **Phase 2 (Component Implementation)**.