# Dataset Inventory — git-viz

All consumption traced through source. Every "why" is grounded in a specific read site.

---

## Quick Reference

| Dataset | Status | Declared By | Purpose |
|---|---|---|---|
| `file_lifecycle` | ✅ Active | TimelineHeatmap | Core event log — directory tree, activity matrix, date range |
| `author_network` | ✅ Active | TimelineHeatmap | Author roster — stats total + filter panel population |
| `file_index` | ✅ Active | TimelineHeatmap + TreemapExplorer (legacy) | Per-file stats: extensions, commits, primary authors |
| `directory_stats` | ✅ Active | TimelineHeatmap | Activity scores — selects top-N heatmap rows |
| `project_hierarchy` | ✅ Active | TreemapExplorer | Pre-built tree — treemap layout backbone |
| `file_metrics_index` | ✅ Active | TreemapExplorer | Per-file metrics: volume, coupling, lifecycle |
| `temporal_daily` | ✅ Active | TreemapExplorer (optional) | Daily activity — powers Time Lens scrubber |
| `cochange_network` | ✅ Active ⚠️ | TreemapExplorer (undeclared) | Co-change pairs — powers Coupling Lens |
| `temporal_monthly` | ❌ Dead | — | No consumer |
| `release_snapshots` | ❌ Dead | — | No consumer |
| `temporal_activity_map` | ❌ Dead | — | No consumer |

---

## Active Datasets

### `file_lifecycle.json`

**Path:** `public/DATASETS_excalidraw/file_lifecycle.json`
**Declared:** `TimelineHeatmapPlugin.ts` — `{ dataset: "file_lifecycle", required: true, alias: "lifecycle" }`
**Preloaded:** Yes — `PluginDataLoader.warmupCache` default list

**Read by `DataProcessor.processRawData` (1st parameter):**

This is the single most important dataset. Everything the heatmap visualizes derives from it.

- Iterates `lifecycle.files` to build the entire directory tree (each file path is split and turned into `OptimizedDirectoryNode` entries)
- Extracts all event timestamps to compute `metadata.date_range`
- Is the source of every activity event — each file event is bucketed by directory + date into the activity matrix, producing the commit counts, operation tallies (A/M/D), author sets, and top-file lists that fill each heatmap cell

---

### `author_network.json`

**Path:** `public/DATASETS_excalidraw/networks/author_network.json`
**Declared:** `TimelineHeatmapPlugin.ts` — `{ dataset: "author_network", required: true, alias: "authors" }`

**Read by `DataProcessor.processRawData` (2nd parameter):**

- `metadata.stats.total_authors` ← `authorNetwork.nodes.length`
- `metadata.authors` ← mapped from `authorNetwork.nodes` (id, email, commit_count)

**Downstream:** `TimelineHeatmapPlugin.renderFilters` reads `data.metadata.authors` to populate the author checkboxes in the sidebar filter panel. Without this dataset the filter renders empty.

---

### `file_index.json`

**Path:** `public/DATASETS_excalidraw/metadata/file_index.json`
**Declared:** `TimelineHeatmapPlugin.ts` — `{ dataset: "file_index", required: true, alias: "files" }`
**Preloaded:** Yes — `PluginDataLoader.warmupCache` default list

**Read by `DataProcessor.processRawData` (3rd parameter):**

- Aggregates file-extension distribution → `metadata.file_types`
- Builds `metadata.file_stats` — per-file records (commit count, primary author, last modified)

**Also read by TreemapExplorer (legacy path):**

- `TreemapExplorerPlugin.tsx` reads `dataset.file_index` directly and passes it to `DataProcessor.enrichFiles`, which attaches health scores to each file for the treemap cells
- `App.tsx` uses `rawData.file_index` as the existence gate to enter that legacy path (`if (!rawData.file_index) return null`)

---

### `directory_stats.json`

**Path:** `public/DATASETS_excalidraw/aggregations/directory_stats.json`
**Declared:** `TimelineHeatmapPlugin.ts` — `{ dataset: "directory_stats", required: true, alias: "dirs" }`
**Preloaded:** Yes — `PluginDataLoader.warmupCache` default list

**Read by `DataProcessor.processRawData` (4th parameter):**

- Builds `metadata.directory_stats` — filtered to only directories that actually exist in the tree (validated against `dirPathToId`)

**Downstream reads:**

- `TimelineHeatmapPlugin.ts`: sorts `metadata.directory_stats` by `activity_score` descending, slices top N — these become the row labels of the heatmap
- `CellDetailPanel.tsx`: looks up a directory's entry when a cell is clicked, to populate the detail tooltip

---

### `project_hierarchy.json`

**Path:** `public/DATASETS_excalidraw/frontend/project_hierarchy.json`
**Declared:** `TreemapExplorerPlugin.tsx` — `{ dataset: "project_hierarchy", required: true, alias: "project_hierarchy" }`

**Read by `DataProcessor.processFrontendData` (1st parameter):**

The structural backbone of the treemap. Unlike the heatmap (which rebuilds its tree from raw `file_lifecycle` events), TreemapExplorer consumes a pre-computed hierarchy directly.

- `hierarchy.tree` is converted from `ProjectHierarchyNode` → `OptimizedDirectoryNode` (the shared internal tree format)
- `hierarchy.meta` supplies repository name and generation date
- `hierarchy.tree.stats.total_commits` provides the top-level commit count

**Guard in `App.tsx`:** paired with `file_metrics_index` — both must be present to enter the new render path.

---

### `file_metrics_index.json`

**Path:** `public/DATASETS_excalidraw/frontend/file_metrics_index.json`
**Declared:** `TreemapExplorerPlugin.tsx` — `{ dataset: "file_metrics_index", required: true, alias: "file_metrics_index" }`

**Read by `DataProcessor.processFrontendData` (2nd parameter):**

The per-file detail layer. For every file in the hierarchy this provides:

- **Volume:** total commits, lines added/deleted, net change
- **Identity:** primary author ID and ownership percentage
- **Lifecycle:** last modified timestamp, dormancy flag
- **Coupling:** top co-change partners (consumed later by the Coupling Lens)

From these, `processFrontendData` builds `fileStats`, `file_types`, and the author-frequency map that feeds `metadata.authors`.

---

### `temporal_daily.json`

**Path:** `public/DATASETS_excalidraw/aggregations/temporal_daily.json`
**Declared:** `TreemapExplorerPlugin.tsx` — `{ dataset: "temporal_daily", required: false, alias: "temporal_daily" }` *(optional)*
**Preloaded:** Yes — `PluginDataLoader.warmupCache` default list

**Read by `TreemapExplorerPlugin.tsx`:**

- Assigned to `this.temporalData` (both in the new path and the legacy path)
- Powers the **Time Lens** — the timeline scrubber that filters the treemap to show only files active at the scrubbed position

Because it's declared optional, the treemap still renders without it. The Time Lens controls simply have no data to work with.

---

### `cochange_network.json` ⚠️

**Path:** `public/DATASETS_excalidraw/networks/cochange_network.json`
**Declared:** *Not declared — see Known Issues below*

**Read by `TreemapExplorerPlugin.tsx` (legacy path):**

- `dataset.cochange_network` is passed to `CouplingDataProcessor`
- The processor extracts file-pair co-change weights and surfaced them as arcs on the treemap

**Downstream:** Powers the **Coupling Lens** — the arc overlay showing which files tend to be modified together. `CouplingDataProcessor` logs a warning if the dataset is missing or malformed.

---

## Dead Datasets

Registered in `DatasetRegistry.ts` and present on disk. No plugin declares them, no production code reads them.

| Dataset | Path | Safe to remove |
|---|---|---|
| `temporal_monthly.json` | `aggregations/temporal_monthly.json` | ✅ Yes |
| `release_snapshots.json` | `milestones/release_snapshots.json` | ✅ Yes |
| `temporal_activity_map.json` | `frontend/temporal_activity_map.json` | ✅ Yes |

References to `temporal_monthly` in `factories.ts` and `PluginRegistry.test.ts` are synthetic mock data used to exercise the registry's validation logic — they don't represent real consumption and don't require the actual JSON file.

---

## Known Issues

### `cochange_network` is undeclared

`TreemapExplorerPlugin` reads `dataset.cochange_network` at runtime but its `dataRequirements` only lists `project_hierarchy`, `file_metrics_index`, and `temporal_daily`. Consequences:

- `PluginRegistry` validation doesn't know TreemapExplorer needs it
- A failed load isn't caught at the loader level — it degrades silently inside `CouplingDataProcessor` instead

Suggested fix in `TreemapExplorerPlugin.tsx` `dataRequirements`:

```typescript
{ dataset: "cochange_network", required: false, alias: "cochange_network" }
```

`required: false` because the Coupling Lens is one of several lenses — the plugin should remain functional without it, but the loader should at least be aware it exists.

---

*Derived from source analysis — February 2026*
