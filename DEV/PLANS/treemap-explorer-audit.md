# Treemap Explorer — Implementation Audit

**Date:** 2026-02-01
**Scope:** `src/plugins/treemap-explorer/` and its service dependencies
**Purpose:** Document the gap between what the plugin currently does and what the available datasets make possible. This becomes the input for a phased refactoring plan.

---

## 1. Data Flow Map

### What the Plugin Declares It Needs

From `TreemapExplorerPlugin.metadata.dataRequirements`:

| Dataset | Required | Alias |
|---|---|---|
| `project_hierarchy` | Yes | `project_hierarchy` |
| `file_metrics_index` | Yes | `file_metrics_index` |
| `temporal_daily` | No | `temporal_daily` |

### What Actually Happens at Runtime

Both required datasets are registered in `DatasetRegistry` and will always succeed. This means `processData()` will **always** take the new frontend-ready branch (`if (dataset.project_hierarchy && dataset.file_metrics_index)`). The legacy fallback branch that loads from `file_index` + `cochange_network` is unreachable dead code.

The three datasets that actually get fetched and parsed on every load:

```
project_hierarchy.json    →  2.56 MB   (traversed to find file nodes)
file_metrics_index.json   →  3.95 MB   (looked up per file for metrics)
temporal_daily.json       →  241 KB    (used only for min/max date range)
```

**Total fetched: ~6.75 MB**

### What Exists But Is Never Fetched

| Dataset | Size | What It Contains | Why It Matters |
|---|---|---|---|
| `cochange_network.json` | 16.3 MB | Full file-coupling edge set | Coupling index is currently lossy (see §3.3) |
| `file_lifecycle.json` | 20.8 MB | Per-file commit event log with diff stats | Only source of true per-file activity timelines and real operation counts |
| `temporal_activity_map.json` | 393 KB | Pre-bucketed weekly activity per directory | Time Lens has no activity visualization |
| `author_network.json` | 1.85 MB | Author collaboration graph | Unused |
| `release_snapshots.json` | 10.7 KB | State at each git tag | Unused |
| `temporal_monthly.json` | ~20 KB | Monthly aggregation | Not even registered in `DatasetRegistry` |

---

## 2. Critical Findings (Correctness)

These are bugs that silently produce wrong output right now.

### 2.1 Operations Data Is Fabricated

**Location:** `TreemapExplorerPlugin.processData()`, inside the `traverse()` function.

When building `EnrichedFileData` from `file_metrics_index`, operations are hardcoded:

```typescript
operations: {
  M: metric.volume.total_commits,   // ← M is set to total_commits, not modification count
  A: 1,                              // ← Always 1
  D: 0,                              // ← Always 0
}
```

`file_metrics_index` does not contain an operations breakdown. The actual operations data exists in two places that are not being used:
- `metadata/file_index.json` has `operations: { A, M, D }` per file
- `file_lifecycle.json` has the raw per-commit operation type

**Impact:** Three things break downstream.

First, the churn rate. `HealthScoreCalculator` computes churn as `M / (M + A + D + R)`. With the fabricated values this resolves to `total_commits / (total_commits + 1)`, which approaches 1.0 for any file with more than a handful of commits. Every file appears to have near-maximum churn.

Second, the Operations Breakdown section in both `DebtView` and `TimeView`. These render the `M`, `A`, `D` counts directly. Users see "Modified: 847, Added: 1, Deleted: 0" for every single file regardless of its actual history.

Third, if health scores are being computed client-side from these fabricated inputs (see §2.2), the churn factor — which carries 40% weight — is poisoned for every file.

### 2.2 Health Score Availability Is Undocumented and Unverified

**Location:** `TreemapExplorerPlugin.processData()`, the `healthScore` assignment.

The code does:

```typescript
healthScore: metric.health
  ? { score: metric.health.score, category: metric.health.category, ... }
  : undefined,
```

The documented schema for `file_metrics_index` (in `dataset_metadata.md`) defines four top-level keys per file: `identifiers`, `volume`, `coupling`, `lifecycle`. There is no `health` key in the documented schema.

If `metric.health` is `undefined` at runtime, then `healthScore` is `undefined` for every file, and the Debt Lens becomes non-functional: `DebtView` renders "Health score not available for this file," `DebtRenderer` defaults every cell to score 100 (all green), and the health threshold filter has no effect.

Health scores *are* present in `project_hierarchy.json` (inside `attributes: { health_score, health_category, bus_factor_status, churn_rate }`), but the traversal code ignores them entirely — it only reads `node.path`, `node.name`, `node.type`, and `node.children`.

**Action needed:** Verify at runtime whether `file_metrics_index` actually contains a `health` key. If it does not, the Debt Lens needs to either (a) read health attributes from `project_hierarchy` during traversal, or (b) compute them client-side from `file_index` which has the real `operations` and `age_days`.

### 2.3 Time Lens Activity Sparkline Is a Permanent Stub

**Location:** `TemporalDataProcessor.buildActivityTimeline()`

```typescript
private static buildActivityTimeline(
  _file: EnrichedFileData,
  _temporalDaily: TemporalDailyData,
): Array<{ date: string; commits: number }> | undefined {
  // For now, return undefined - activity timeline requires file-level temporal data
  // which isn't available in temporal_daily.json (it's aggregated by day, not by file)
  return undefined;
}
```

The comment is accurate — `temporal_daily` is aggregated across all files, not per-file. But the data *does* exist: `file_lifecycle.json` contains a full per-file event log with timestamps. The sparkline rendering code in `TimeView` is complete and wired up — it just never receives data.

This means the Time Lens detail panel has a visible empty section ("Activity Timeline") that never populates.

### 2.4 Legacy HealthScoreCalculator Age Factor Is Dead

**Location:** `DataProcessor.enrichFiles()` (legacy path)

Even in the legacy fallback, `HealthScoreCalculator.calculate()` is called without `lastModifiedDaysAgo`:

```typescript
const healthScore = HealthScoreCalculator.calculate({
  totalCommits: stats.total_commits,
  uniqueAuthors: stats.unique_authors || 1,
  operations: stats.operations || {},
  ageDays: stats.age_days || 0,
  // lastModifiedDaysAgo is never passed
});
```

Inside `scoreAge()`, when `lastModifiedDaysAgo` is `undefined`, it defaults to `0`, which returns a score of `100` unconditionally. The age factor (30% weight) always scores maximum, making the dormancy penalty that's central to the health model inert.

This is moot if the legacy path is truly unreachable, but it means any future restoration of that path inherits the bug.

---

## 3. High-Priority Gaps (Underutilization)

### 3.1 Diff Volume Data Exists, Is Never Displayed

`file_metrics_index` provides per file:

```json
"volume": {
  "lines_added": 420,
  "lines_deleted": 110,
  "net_change": 310,
  "total_commits": 18
}
```

The metadata doc explicitly states this file "Powers the Detail Panel with per-file volume, coupling partners, and lifecycle state." The plugin reads `volume.total_commits` but never touches `lines_added`, `lines_deleted`, or `net_change`.

None of the three detail panel views (`DebtView`, `CouplingView`, `TimeView`) display line-level churn. These are pre-computed numbers, zero additional fetch cost, and directly relevant to code health assessment.

### 3.2 Coupling Index Is Lossy

The new path builds the coupling index by iterating over each file's `coupling.top_partners` array from `file_metrics_index`:

```typescript
this.couplingIndex.set(file.key, {
  partners: file.coupledFiles.map(...),  // ← only what top_partners included
  ...
});
```

`top_partners` is a per-file summary — it contains only the strongest partners for each file, not the full edge set. This creates two problems:

First, asymmetry. If File A lists File B as a top partner but File B does not list File A (because B has stronger partners), the arc renders in one direction but the detail panel on B shows no relationship to A.

Second, missing edges. Any coupling relationship that didn't make either file's top-partners list disappears entirely. The `cochange_network.json` dataset contains the complete edge set and `CouplingDataProcessor.process()` is already written to build a correct bidirectional index from it — but it is never called in the new path.

### 3.3 Time Lens Has No Activity Visualization Layer

The Time Lens currently shows:
- A timeline scrubber controlling which files are visible (based on creation date)
- Per-file dormancy status in the detail panel

What it does not show:
- Any indication of *when* activity happened within a file's lifetime
- Any directory-level activity patterns over time

`temporal_activity_map.json` (393 KB, already registered in `DatasetRegistry`) provides exactly this: weekly activity bucketed by directory, with commit count, lines changed, and unique authors. It is never requested by the plugin.

### 3.4 Coupling Color Scale Saturates at 0.1

**Location:** `colorScales.ts`, `getCouplingColor()`

```typescript
const intensity = Math.min(coupling / 0.1, 1); // Cap at 0.1
```

The coupling strengths in the dataset range from near-zero up to 0.72+ (per the metadata doc example). This scale clamps everything above 0.1 to maximum intensity. A file with coupling strength 0.12 and one with 0.72 render identically. The purple color scale provides zero visual differentiation across the majority of the actual data range.

---

## 4. Medium-Priority Issues (Architecture & Consistency)

### 4.1 Two Divergent Debt Color Scales

There are two independent implementations of debt-lens coloring that produce different output:

| Location | Behavior |
|---|---|
| `colorScales.ts` → `getDebtColor()` | 4-step quantized: green ≥75, yellow ≥50, orange ≥25, red <25 |
| `DebtRenderer.getCellColor()` | 5-segment smooth gradient using `d3.interpolate` across the full 0–100 range |

Currently `DebtRenderer` wins for debt mode (because `USE_NEW_RENDERER_SYSTEM = true`), making `getDebtColor()` dead code for this lens. But the two implementations will diverge again if the feature flag is toggled or if debt coloring is needed in any other context.

### 4.2 Renderer System Is Half-Implemented

The new renderer architecture (`BaseTreemapRenderer` → concrete subclasses) exists only for debt:

```typescript
// In TreemapExplorerPlugin:
private debtRenderer: DebtRenderer | null = null;
// TODO: Add coupling and time renderers when implemented
// private couplingRenderer: CouplingRenderer | null = null;
// private timeRenderer: TimeRenderer | null = null;
```

`getRenderer()` returns `null` for coupling and time, which forces them through the legacy `renderLegacy()` path. This means:
- Debt mode uses the new renderer pipeline (enrich → filter → layout → render → extras)
- Coupling and time modes use the old monolithic render function

The two paths have divergent behaviors. For example, `DebtRenderer.getCellOpacity()` modulates opacity by bus factor risk — this visual cue exists only in debt mode. The legacy path's coupling opacity logic (dim everything except the selected file) is entirely separate and inconsistent in style.

### 4.3 `temporal_monthly.json` Is Missing From the Registry

The file exists at `public/DATASETS_excalidraw/aggregations/temporal_monthly.json` (visible in the directory tree) but has no entry in `DatasetRegistry`. It cannot be loaded through the standard plugin data pipeline.

### 4.4 Warmup Cache Targets Legacy Datasets

`PluginDataLoader.warmupCache()` defaults to preloading:

```typescript
["file_lifecycle", "directory_stats", "file_index", "temporal_daily"]
```

The treemap plugin actually uses `project_hierarchy` and `file_metrics_index`. These are not in the warmup list, so the plugin's required datasets are never pre-cached.

---

## 5. Low-Priority Items

### 5.1 Legacy Fallback Is Unreachable

The `processData()` branch that handles missing `project_hierarchy`/`file_metrics_index` and falls back to `file_index` + `cochange_network` can never execute because both required datasets are always registered and fetchable. This is ~40 lines of dead code plus the `DataProcessor.enrichFiles()` method it calls.

### 5.2 Feature Flag Is Hardcoded

```typescript
const USE_NEW_RENDERER_SYSTEM = true;
```

This is not configurable at runtime or via environment variable. It exists only as a code-level switch.

---

## 6. Dataset Utilization Matrix

Summary of every dataset's relationship to the Treemap Explorer.

| Dataset | Registered? | Fetched? | Used? | Notes |
|---|---|---|---|---|
| `project_hierarchy` | ✓ | ✓ | Partially | Traversed for file paths; `attributes` (health, churn) ignored |
| `file_metrics_index` | ✓ | ✓ | Partially | `volume.lines_added/deleted/net_change` unused; `health` key unverified |
| `temporal_daily` | ✓ | ✓ | Minimally | Only for min/max date range extraction |
| `cochange_network` | ✓ | ✗ | ✗ | Full coupling edges available; not requested |
| `temporal_activity_map` | ✓ | ✗ | ✗ | Weekly activity data; not requested |
| `file_lifecycle` | ✓ | ✗ | ✗ | Per-file event log; needed for sparklines and real operations |
| `file_index` | ✓ | ✗ | ✗ | Has real `operations`; only used in dead legacy path |
| `author_network` | ✓ | ✗ | ✗ | — |
| `directory_stats` | ✓ | ✗ | ✗ | — |
| `release_snapshots` | ✓ | ✗ | ✗ | — |
| `temporal_monthly` | ✗ | ✗ | ✗ | Not even registered |
