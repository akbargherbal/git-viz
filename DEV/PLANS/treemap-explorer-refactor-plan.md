# Treemap Explorer — Phased Refactoring Plan

**Derived from:** `treemap-explorer-audit.md`
**Principle:** Phases are ordered by dependency. Later phases assume earlier ones are complete and verified. Each phase has explicit success criteria before moving on.

---

## Pre-condition: Runtime Verification

Before Phase 1 begins, we must resolve the open question from Audit §2.2. Add a temporary log in `processData()` right after the `if (dataset.project_hierarchy && dataset.file_metrics_index)` guard:

```typescript
// TEMPORARY — remove after verification
const sampleKey = Object.keys(dataset.file_metrics_index)[0];
console.log('[AUDIT VERIFY] top-level keys:', Object.keys(dataset.file_metrics_index[sampleKey]));
console.log('[AUDIT VERIFY] full entry:', JSON.stringify(dataset.file_metrics_index[sampleKey], null, 2));
```

**Two possible outcomes:**

**A) `health` key exists.** Phase 1 can consume it directly. Verify its shape matches what the code expects (`score`, `category`, `churnRate`, `busFactor`, `factors`). Phase 1 simplifies — skip the `project_hierarchy` attributes fallback described below.

**B) `health` key does not exist.** Phase 1 must source health data from `project_hierarchy`'s `attributes` field during the tree traversal. This is the more likely outcome given the documented schema, so the plan below is written for this case.

Remove the temporary log before starting Phase 1.

---

## Phase 1: Data Foundation

**Goal:** Replace fabricated data with real values. Fix the correctness bugs (§2.1, §2.2) that poison the Debt Lens and Operations displays across all three lenses. §2.4 is fixed as a byproduct.

**Audit refs:** §2.1 (fabricated operations), §2.2 (health score availability), §2.4 (age factor dead in legacy calculator)

### New data requirement

Add to `metadata.dataRequirements` in `TreemapExplorerPlugin`:

```typescript
{ dataset: "file_index", required: true, alias: "file_index" }
```

`file_index` is already registered in `DatasetRegistry` (2.5 MB). It is the only dataset that provides real per-file `operations: { A, M, D }`, plus `age_days`, `first_seen`, `last_modified`, and `unique_authors`. It is the ground-truth source for everything that `file_metrics_index` lacks.

### Files changed

- `TreemapExplorerPlugin.tsx` — `metadata.dataRequirements` and the traversal logic inside `processData()`

No changes to processors, renderers, or detail panel views in this phase. All downstream code already expects the correct data shape — it just hasn't been receiving it.

### Approach

The traversal in `processData()` currently draws from two sources: `project_hierarchy` (tree structure) and `file_metrics_index` (metrics). Add a third lookup into `file_index` for each file node. The merge order for each file becomes:

**1. Structure** from `project_hierarchy` node: `path`, `name`, `type`, children traversal.

**2. Ground-truth metadata** from `file_index[node.path]`: `operations`, `age_days`, `first_seen`, `last_modified`, `unique_authors`, `commits_per_day`, `lifecycle_event_count`. These replace the hardcoded `operations` block entirely.

**3. Health score** — two-part construction:

Top-level fields (`score`, `category`, `busFactor`) come from `project_hierarchy`'s `node.attributes` (`health_score`, `health_category`, `bus_factor_status`). These are backend-computed over full history and are authoritative.

The `factors` breakdown (`churn`, `authors`, `age` with scores and weights) does not exist in any pre-aggregated dataset. Recompute it client-side by calling `HealthScoreCalculator.calculate()` with the now-real inputs from `file_index`:

```typescript
const factors = HealthScoreCalculator.calculate({
  totalCommits: fileIndexEntry.total_commits,
  uniqueAuthors: fileIndexEntry.unique_authors ?? 1,
  operations: fileIndexEntry.operations ?? {},
  ageDays: fileIndexEntry.age_days ?? 0,
  lastModifiedDaysAgo: computeDaysSince(fileIndexEntry.last_modified),
});
```

Passing `lastModifiedDaysAgo` fixes §2.4: the age factor's dormancy penalty (30% weight) was previously dead because this parameter was never provided.

Merge the two: `{ score, category, busFactor }` from backend attributes, `{ factors, churnRate }` from the recomputation.

**4. Coupling and volume** from `file_metrics_index` — unchanged. These fields (`coupling.top_partners`, `volume.total_commits`) are still the correct source for now. Phase 2 addresses the coupling index quality; the volume fields are read-only presentation data.

### Why not just use `file_index` for everything?

`file_metrics_index` has pre-computed coupling partners and volume aggregates that `file_index` lacks. The correct model is three complementary sources: `project_hierarchy` for structure and health scores, `file_index` for per-file metadata, `file_metrics_index` for coupling and volume. Each contributes what it uniquely provides.

### Success criteria

- Operations Breakdown in DebtView and TimeView shows varied, realistic M/A/D distributions — not the uniform `(total_commits, 1, 0)` pattern
- Debt Lens cell colors show a genuine distribution across the red→yellow→green spectrum
- The health threshold slider visibly changes which files are displayed
- A sample `EnrichedFileData` logged to console confirms `operations.M !== total_commits` and `healthScore.factors` is populated

---

## Phase 2: Coupling Lens Restoration

**Goal:** Fix the lossy coupling index and the broken color scale so the Coupling Lens renders accurate, symmetric relationships with meaningful visual differentiation.

**Audit refs:** §3.2 (lossy/asymmetric coupling index), §3.4 (color scale saturates at 0.1)

### Files changed

- `TreemapExplorerPlugin.tsx` — `metadata.dataRequirements` and coupling index construction in `processData()`
- `colorScales.ts` — saturation cap in `getCouplingColor()`

### Approach — coupling index

Add to `metadata.dataRequirements`:

```typescript
{ dataset: "cochange_network", required: false, alias: "cochange_network" }
```

It is optional because it is 16 MB — the heaviest dataset in the suite. If it fails to load, the existing `top_partners`-based index remains as a degraded fallback (log a warning when this happens).

When present, replace the hand-rolled index construction in `processData()` with the two calls that already exist and are currently bypassed:

```typescript
if (dataset.cochange_network) {
  this.couplingIndex = CouplingDataProcessor.process(dataset.cochange_network);
  CouplingDataProcessor.enrichWithCoupling(this.data, dataset.cochange_network);
}
```

`CouplingDataProcessor.process()` builds a correct bidirectional index from the full edge set. `enrichWithCoupling()` populates `couplingMetrics` and `coupledFiles` on each file object. Both are already tested and production-ready — they are simply not being called in the current data path.

The hand-rolled index construction block (the `enrichedFiles.forEach` that builds `this.couplingIndex` from `file.coupledFiles`) becomes the fallback path, executed only when `cochange_network` is absent.

### Approach — color scale

Single-line fix in `getCouplingColor()`:

```typescript
// Before — saturates at 0.1, making 99% of the real data range indistinguishable:
const intensity = Math.min(coupling / 0.1, 1);

// After — saturates at 0.8, matching the actual max observed coupling strengths:
const intensity = Math.min(coupling / 0.8, 1);
```

### Success criteria

- Coupling arcs are symmetric: selecting File A shows an arc to File B; selecting File B shows an arc back to File A
- The Coupling detail panel's partner list matches what the arc overlay shows for the same file
- Cells in coupling mode show a visible gradient from dark gray (no coupling) through light purple (weak) to bright purple (strong) — not a uniform purple wash
- Network tab confirms `cochange_network.json` is being fetched

---

## Phase 3: Time Lens Completion

**Goal:** Replace the permanent sparkline stub with real per-file activity data. Make directory-level temporal activity available to the Time Lens pipeline.

**Audit refs:** §2.3 (sparkline stub returns `undefined`), §3.3 (no activity visualization layer)

### Files changed

- `TreemapExplorerPlugin.tsx` — `metadata.dataRequirements`, pass `file_lifecycle` through to temporal enrichment
- `TemporalDataProcessor.ts` — implement `buildActivityTimeline()`

### New data requirements

```typescript
{ dataset: "file_lifecycle",        required: false, alias: "file_lifecycle" }
{ dataset: "temporal_activity_map", required: false, alias: "temporal_activity_map" }
```

`file_lifecycle` is 20 MB — the heaviest single dataset. Marked optional so the Time Lens degrades gracefully if it fails to load. `temporal_activity_map` is 393 KB, trivial.

### Approach — sparkline

`file_lifecycle.json` provides per-file event arrays:

```json
{
  "files": {
    "src/main.py": [
      { "timestamp": 1712927658, "operation": "M", ... },
      ...
    ]
  }
}
```

Implement `buildActivityTimeline()` to:

1. Look up `file_lifecycle.files[file.key]`. If absent, return `undefined` (file has no recorded history — sparkline stays hidden).
2. Choose a time bucketing granularity based on event density: if the file has more than 50 events, bucket by week; otherwise bucket by month. This keeps the sparkline readable regardless of file activity volume.
3. Iterate events, accumulate commit counts per bucket, return as `Array<{ date: string; commits: number }>`.

No new rendering code is needed. `TimeView` already contains a complete sparkline implementation — it iterates the array, computes bar heights relative to the max, and renders proportional `div` bars. It simply never receives data because `buildActivityTimeline()` returns `undefined`.

### Approach — directory activity

`temporal_activity_map.json` provides weekly activity buckets per directory: `[commits, lines_changed, unique_authors]`. Ensure this dataset is fetched and stored on the plugin instance (e.g., `this.temporalActivityMap = dataset.temporal_activity_map`), making it available to the Time Lens rendering pipeline.

The exact visualization for this data (activity strip, heatmap overlay, summary panel) is a design decision best deferred to implementation. This phase's scope is limited to ensuring the data is loaded and accessible. If the design decision is made before implementation begins, a `TimeRenderer` (Phase 4) can consume it directly.

### Performance consideration

`buildActivityTimeline()` runs per-file during `TemporalDataProcessor.enrichFilesWithTemporal()`, which is called on every scrubber position change. Bucketing 3,484 files on every drag event will be slow.

Implement the simple version first. If scrubbing feels laggy, apply this optimization: pre-compute all per-file timelines once when `file_lifecycle` first loads (store them in a `Map<string, timeline>`), and look up the pre-computed result in `buildActivityTimeline()` instead of recomputing. The bucketing logic does not depend on `timePosition` — only the visibility filter does, and that is handled separately.

### Success criteria

- Time Lens detail panel shows a populated sparkline for files that have commit history in the dataset
- Sparkline bars vary in height across time periods — not uniform
- Files with no history show no sparkline section (graceful absence, not an empty box)
- Timeline scrubbing remains responsive. If lag is observed, apply the pre-computation optimization before shipping.
- Network tab confirms both `file_lifecycle.json` and `temporal_activity_map.json` are fetched

---

## Phase 4: Renderer Unification

**Goal:** Bring Coupling and Time lenses into the new `BaseTreemapRenderer` architecture. Eliminate `renderLegacy()` and all divergent code paths it maintains. Remove the feature flag.

**Audit refs:** §4.1 (two divergent debt color scales), §4.2 (renderer system half-implemented)

### Files changed

- New: `renderers/CouplingRenderer.ts`
- New: `renderers/TimeRenderer.ts`
- `TreemapExplorerPlugin.tsx` — wire new renderers into `getRenderer()`, remove `renderLegacy()`, remove `USE_NEW_RENDERER_SYSTEM` flag, remove the duplicate tooltip logic that exists on both paths
- `colorScales.ts` — remove `getDebtColor()` (becomes dead code once `DebtRenderer.getCellColor()` is the sole debt coloring path)

### Approach

Both new renderers extend `BaseTreemapRenderer` following the established pattern from `DebtRenderer`:

**`CouplingRenderer`:**

| Method | Implementation |
|---|---|
| `enrichData()` | No-op. Coupling data is already on each file from Phase 2. |
| `filterData()` | No filter. All files are shown in coupling mode. |
| `getCellColor()` | Delegates to `getCouplingColor()` (fixed in Phase 2). |
| `getCellOpacity()` | When a file is selected: 1.0 for the selected file and its coupling partners, 0.1 for all others. When no file is selected: 1.0 for all. This is the "dim non-selected" behavior currently only in `renderLegacy()`. |
| `renderExtras()` | Instantiates `CouplingArcRenderer`, calls `render()` when `state.selectedFile` is set and `state.showArcs` is true. |
| `cleanup()` | Calls `arcRenderer.destroy()`. |

**`TimeRenderer`:**

| Method | Implementation |
|---|---|
| `enrichData()` | Calls `TemporalDataProcessor.enrichFilesWithTemporal()` with current `state.timePosition`. This is where per-file visibility and sparkline data gets attached. |
| `filterData()` | Filters to files where `createdPosition <= state.timePosition`. |
| `getCellColor()` | Delegates to `getTimeColor()`. |
| `getCellOpacity()` | 0.3 for dormant files when `state.timeFilters.fadeDormant` is true; 1.0 otherwise. |
| `renderExtras()` | No-op for now. Placeholder for future creation-highlight animations or activity overlays using `temporal_activity_map` data from Phase 3. |
| `cleanup()` | No-op. |

Once both renderers are wired in, `getRenderer()` returns a valid renderer for all three lens modes. The conditions for removing legacy code are met:

- Delete `renderLegacy()` entirely
- Delete `USE_NEW_RENDERER_SYSTEM` and all conditionals that reference it
- Delete the duplicate `showTooltip()` / `positionTooltip()` / `hideTooltip()` methods on the plugin class — tooltip handling is now owned exclusively by `BaseTreemapRenderer`
- Delete `getDebtColor()` from `colorScales.ts`

### Success criteria

- All three lenses produce visually identical output before and after this phase. This is a pure structural refactor with zero user-visible change.
- `renderLegacy` is deleted. `grep -r "renderLegacy" src/` returns zero results.
- `USE_NEW_RENDERER_SYSTEM` is deleted. `grep -r "USE_NEW_RENDERER" src/` returns zero results.
- `getDebtColor` is deleted. `grep -r "getDebtColor" src/` returns zero results.
- Zero TODO comments remain in the renderer files.

---

## Phase 5: Cleanup

**Goal:** Remove dead code, fix registry gaps, align the cache warmup with what the plugin actually loads.

**Audit refs:** §4.3 (`temporal_monthly` not registered), §4.4 (warmup cache targets wrong datasets), §5.1 (legacy fallback unreachable)

### Files changed

- `DatasetRegistry.ts` — add `temporal_monthly`
- `PluginDataLoader.ts` — update `warmupCache()` defaults
- `TreemapExplorerPlugin.tsx` — remove legacy fallback branch in `processData()`
- `DataProcessor.ts` — remove `enrichFiles()` if no other plugin calls it (verify with grep first)

### Approach

**Register `temporal_monthly`:**

```typescript
temporal_monthly: {
  path: "/DATASETS_excalidraw/aggregations/temporal_monthly.json",
  type: "time_series",
  description: "Monthly commit activity aggregation",
  schema_version: "2.0",
  size_estimate: "~20 KB",
},
```

**Fix warmup cache defaults.** Replace the current defaults (which target legacy datasets) with what the Treemap Explorer actually fetches:

```typescript
async warmupCache(
  commonDatasets: string[] = [
    "project_hierarchy",
    "file_metrics_index",
    "file_index",
    "temporal_daily",
  ],
): Promise<void> { ... }
```

`cochange_network` and `file_lifecycle` are intentionally excluded from warmup. They are large (16 MB and 20 MB respectively), optional, and only needed when the user enters Coupling or Time lens mode. They should remain demand-loaded.

**Remove legacy fallback.** The `// LEGACY FALLBACK` branch in `processData()` (everything after the new-path `if` block closes) is unreachable because both `project_hierarchy` and `file_metrics_index` are required and always registered. Delete it.

Before deleting `DataProcessor.enrichFiles()`, verify no other plugin or service calls it:

```bash
grep -rn "enrichFiles" src/ --include="*.ts" --include="*.tsx"
```

If the only reference is the definition itself, delete the method. If another consumer exists, leave it.

### Success criteria

- `DatasetRegistry.getPath("temporal_monthly")` returns the correct path
- On a cold page load (cleared browser cache), network tab shows `project_hierarchy` and `file_metrics_index` fetching before any user interaction
- `grep -rn "LEGACY FALLBACK" src/` returns zero results
- `grep -rn "enrichFiles" src/` returns zero results (or only the definition if retained for another consumer)

---

## Deferred (Intentionally Out of Scope)

These findings from the audit are real gaps but do not belong in this refactoring plan:

**Displaying `lines_added` / `lines_deleted` / `net_change` in detail panels (§3.1).** The data becomes available at zero additional fetch cost after Phase 1. But where to surface it — which lens, what visual treatment, how it relates to the existing churn rate display — is a UI design decision. Recommend a focused detail-panel layout pass as a follow-up.

**Backend enrichment of `file_metrics_index`.** The architecturally correct long-term fix for §2.1 is to have the backend include real `operations` (and optionally `factors`) in `file_metrics_index`, eliminating the need to fetch `file_index` as a supplementary source. This is a backend pipeline change, not a frontend refactoring task.

**Heatmap timeline plugin.** Per the session scope, this plugin is audited and addressed separately after Treemap Explorer work is complete.
