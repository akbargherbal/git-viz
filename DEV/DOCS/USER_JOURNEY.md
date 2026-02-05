# Git Repository Visualization - User Journeys
---

## Application Architecture

### Detected Layout

- **Header**: Contains the app title, **Visualization Selector** (Dropdown), and **Global Toolbar** (Time binning for Timeline Heatmap only).
- **Main Canvas**: A large, scrollable area (`<main>`) rendering D3.js visualizations (Timeline Heatmap or Treemap).
- **Right Sidebar (Dynamic)**:
  - **Filter Panel**: Configuration specific to the active visualization.
  - **Detail Panel**: Context-aware details that slide in when a data point is clicked.
- **Bottom Overlay**: A **Timeline Scrubber** that appears specifically when the "Evolution" lens is active in the Treemap.

### Key Interactions

- **Visualization Switching**: Toggling between "Timeline Heatmap" (Priority 1 - Default) and "Treemap Explorer" (Priority 2).
- **Lens Switching**: Inside Treemap, switching between "Technical Debt", "Coupling", and "Evolution".
- **Drill-down**: Clicking a heatmap cell or treemap node opens a detailed side panel.
- **Playback**: A play/pause mechanism for animating the repository history (Treemap Evolution lens only).

---

## Data Architecture

### Core Data Schemas

#### Timeline Heatmap Cell Structure

```typescript
interface HeatmapCell {
  directory: string; // Directory path
  timeBin: Date; // Start of time bucket
  events: number; // Total lifecycle events (A+M+D)
  commits: number; // Commit count (used for visualization)
  authors: number; // Unique author count
  creations: number; // Files added
  deletions: number; // Files deleted
  modifications: number; // Files modified
  value: number; // Always equals commits
  topContributors: string[]; // Top 5 contributors
  topFiles: string[]; // Top 5 active files
}
```

#### Treemap Explorer File Data

```typescript
interface EnrichedFileData {
  key: string; // Unique file identifier
  name: string; // File name
  path: string; // Full file path
  total_commits: number; // Total commit count
  unique_authors: number; // Number of contributors
  lifecycle_event_count: number; // Total lifecycle events

  primary_author?: {
    email: string;
    commit_count: number;
    percentage: number;
  };

  healthScore?: {
    score: number; // 0-100
    category: "healthy" | "medium" | "critical";
    churnRate: number; // Modification frequency
    busFactor: "low-risk" | "medium-risk" | "high-risk";
    factors: {
      churn: { score: number; weight: number };
      authors: { score: number; weight: number };
      age: { score: number; weight: number };
    };
  };

  couplingScore: number; // Max coupling strength
  couplingMetrics: {
    maxStrength: number; // Strongest coupling relationship
    avgStrength: number; // Average coupling strength
    totalPartners: number; // Number of coupled files
    strongCouplings: number; // Count with strength > 0.5
  };

  coupledFiles: Array<{
    file: string; // Coupled file path
    strength: number; // Coupling strength (0-1)
    cochangeCount: number; // Times changed together
  }>;

  first_seen?: string; // ISO date of creation
  last_modified?: string; // ISO date of last change
  age_days?: number; // File age in days
  operations: {
    // Lifecycle operations
    M: number; // Modifications
    A: number; // Additions
    D: number; // Deletions
    R: number; // Renames
  };
  activityTimeline?: Array<{
    // Temporal activity (if available)
    date: string;
    commits: number;
  }>;
}
```

### Dataset Registry

All datasets are registered in `DatasetRegistry.ts`. Here's the complete breakdown:

| Dataset Name              | Type        | Used By Timeline | Used By Treemap | Size     | Status                    |
| ------------------------- | ----------- | ---------------- | --------------- | -------- | ------------------------- |
| **file_lifecycle**        | metadata    | ✅ Required      | Optional        | 9.56 MB  | Active                    |
| **author_network**        | network     | ✅ Required      | -               | 1.77 MB  | Active                    |
| **file_index**            | metadata    | ✅ Required      | ✅ Required     | 1.29 MB  | Active                    |
| **directory_stats**       | hierarchy   | ✅ Required      | -               | 851 KB   | Active                    |
| **project_hierarchy**     | hierarchy   | -                | ✅ Required     | 0.5 MB   | Active                    |
| **file_metrics_index**    | metadata    | -                | ✅ Required     | 1.5 MB   | Active                    |
| **cochange_network**      | network     | -                | Optional        | 21.43 MB | Active                    |
| **temporal_daily**        | time_series | -                | Optional        | 245 KB   | Active                    |
| **temporal_activity_map** | time_series | -                | Optional        | 2.5 MB   | Active                    |
| **temporal_monthly**      | time_series | -                | -               | ~20 KB   | **Registered but UNUSED** |
| **release_snapshots**     | snapshot    | -                | -               | 10.39 KB | **Registered but UNUSED** |

**Note**: `temporal_monthly` and `release_snapshots` are registered in the DatasetRegistry but are not requested by any active plugin.

---

## User Journeys

### 1. The "High-Level Overview" Journey (Timeline Heatmap)

**Default View** - Loads automatically on app startup (Priority 1)

#### Entry & Navigation

- User loads the app. The **Timeline Heatmap** loads by default.
- User sees a grid with:
  - **Rows**: Top N directories (sorted by activity score)
  - **Columns**: Time bins (Week/Month/Quarter/Year)
  - **Cells**: Color-coded by commit intensity (blue gradient)
- User can pan/scroll across the large grid using:
  - Mouse drag
  - On-screen arrow overlays
  - Native scrollbars

#### Configuration - Header Controls

- User clicks the **Time Bin** selector in the header
- Options: "Day", "Week", "Month", "Quarter", "Year"
- Columns dynamically re-group based on selection
- **Note**: Metric is fixed to "Commits" (not user-selectable)

#### Configuration - Filter Panel

User opens the **Filter Panel** (right sidebar) to access:

1. **Directory Count Slider**
   - Range: 5 to 100 directories
   - Default: 20
   - Adjusts how many top directories are shown

2. **Directory Exclusions**
   - Checkboxes for top 50 directories (by activity score)
   - Toggle to hide specific directories from visualization
   - Shows commit count and file count for each directory
   - "Clear All" button to reset exclusions
   - Excluded directories show strikethrough styling

#### Investigation - Cell Details

- User spots a "hot" cell (bright blue = high commit activity)
- User **clicks the cell**
- **Detail Panel** slides in from the right showing:
  - Directory path and time period
  - Exact commit count
  - Unique author count
  - Event breakdown:
    - Files Added (with green border indicator)
    - Files Deleted (with red border indicator)
    - Files Modified
  - "Top Contributors" list (up to 5)
  - "Most Active Files" list (up to 5)

#### Visual Indicators

- **Cell Color**: Blue gradient (hue 210°) indicates commit intensity
- **Green Bottom Border**: File creations occurred in this cell
- **Red Top Border**: File deletions occurred in this cell
- **Hover Effect**: Cell scales up (1.1x) on hover
- **Sticky Headers**: Column headers and row labels remain visible during scroll

---

### 2. The "Code Health" Audit (Treemap - Debt Lens)

#### Switching Context

- User clicks the **Visualization Selector** (top left)
- User chooses **"Treemap Explorer"**
- Application loads new datasets (project_hierarchy, file_metrics_index)

#### Default Lens

- **"Technical Debt"** lens is active by default
- Visual encoding:
  - **Box Size**: Total Commits (or Authors, toggle via header)
  - **Box Color**: Health Score gradient
    - Green (0-210°): Healthy (score 70-100)
    - Yellow (30-60°): Medium risk (score 40-69)
    - Red (0-30°): Critical (score 0-39)

#### Filtering

- User opens **Filter Panel**
- Adjusts **"Health Threshold"** slider (0-100)
- Toggles **"Critical Only"** checkbox to hide healthy files
- Visualization updates immediately

#### Deep Dive

- User clicks a large red box (critical health)
- **Detail Panel** opens showing:
  - File path and name
  - Health Score (e.g., 30/100) with category badge
  - Risk factors breakdown:
    - **Churn Rate**: High modification frequency
    - **Bus Factor**: Low author diversity (high-risk)
    - **Age Factor**: File maturity impact
  - Each factor shows: score (0-100), weight in calculation
  - Lifecycle status: "Active" or "Dormant"
  - Primary author with commit percentage
  - Total commits and unique authors

---

### 3. The "Dependency Discovery" Journey (Treemap - Coupling Lens)

#### Lens Selection

- User switches the Treemap lens to **"Coupling Analysis"**
- Color scale changes to purple gradient (indicates coupling strength)

#### Visual Feedback

- User hovers over a file box
- **Arcs (Curved Lines)** appear dynamically
- Arcs connect the hovered file to coupled files
- Arc thickness indicates coupling strength

#### Refinement

- User opens **Filter Panel**
- Adjusts **"Coupling Strength Threshold"** slider (0.0 - 1.0)
- Default: 0.03 (shows only meaningful couplings)
- Weak connections (below threshold) are hidden

#### Analysis

- User clicks a file with many arc connections
- **Detail Panel** lists "Coupling Partners":
  - File paths sorted by coupling strength
  - Strength percentage (e.g., "Very High - 90%")
  - Cochange count (times modified together)
  - Visual strength indicator bar
- Shows coupling metrics:
  - Max Strength: Strongest single relationship
  - Avg Strength: Average across all partners
  - Total Partners: Number of coupled files
  - Strong Couplings: Count with strength > 0.5

---

### 4. The "Time Travel" Journey (Treemap - Evolution Lens)

#### Lens Selection

- User switches the Treemap lens to **"Evolution"**
- **Timeline Scrubber** bar appears at bottom of screen

#### Playback Animation

- User presses the **Play button** on scrubber
- Treemap animates over repository history:
  - New files pop in with green highlight
  - Active files maintain normal colors
  - Dormant files fade to grey/dark
- Animation speed: ~0.5% progress per 100ms

#### Manual Scrubbing

- User pauses playback
- User drags the slider to specific date (e.g., "Jan 2022")
- Visualization shows repository state at that moment
- User toggles **"Highlight New Files"** filter
- Newly created files at selected date appear with green tint

#### Time Filters (Filter Panel)

- **Show Creations**: Toggle to highlight newly added files
- **Fade Dormant**: Toggle to grey-out inactive files
- Both filters work in combination with timeline position

#### History Analysis

- User clicks a file while at specific timeline position
- **Detail Panel** shows:
  - "Activity Timeline" sparkline graph
  - File's complete commit history
  - Created date and last modified date
  - Age in days at current timeline position
  - Activity status (Active/Dormant) at that point in time

---

## State Management

### Timeline Heatmap State

```typescript
interface TimelineHeatmapState {
  metric: "commits"; // Fixed, not user-configurable
  timeBin: "day" | "week" | "month" | "quarter" | "year";
  directoryCount: number; // 5-100, default 20
  excludedDirectories: string[]; // Paths to hide
}
```

**Processing State Keys**: `["excludedDirectories", "directoryCount"]`  
Changes to these fields trigger data reprocessing. `timeBin` is handled separately via global filters.

### Treemap Explorer State

```typescript
interface TreemapExplorerState {
  lensMode: "debt" | "coupling" | "time";
  sizeMetric: "commits" | "authors";
  selectedFile: string | null;
  healthThreshold: number; // 0-100, default 100 (show all)
  couplingThreshold: number; // 0-1, default 0.03
  showArcs: boolean;
  timePosition: number; // 0-100 percentage
  playing: boolean;
  timeFilters: {
    showCreations: boolean;
    fadeDormant: boolean;
  };
}
```

**Processing State Keys**: Changes to lens mode, thresholds, or time filters trigger data reprocessing.

---

## Plugin Architecture

### Plugin Metadata

#### Timeline Heatmap

```typescript
{
  id: "timeline-heatmap",
  name: "Timeline Heatmap",
  priority: 1,                          // Loads first by default
  version: "5.1.0",
  dataRequirements: [
    { dataset: "file_lifecycle", required: true },
    { dataset: "author_network", required: true },
    { dataset: "file_index", required: true },
    { dataset: "directory_stats", required: true }
  ]
}
```

#### Treemap Explorer

```typescript
{
  id: "treemap-explorer",
  name: "Treemap Explorer",
  priority: 2,
  version: "2.4.0",
  dataRequirements: [
    { dataset: "project_hierarchy", required: true },
    { dataset: "file_metrics_index", required: true },
    { dataset: "file_index", required: true },
    { dataset: "cochange_network", required: false },
    { dataset: "temporal_daily", required: false },
    { dataset: "file_lifecycle", required: false },
    { dataset: "temporal_activity_map", required: false }
  ]
}
```

### Control Ownership

Both plugins implement the `PluginControlProps` interface:

- **Timeline Heatmap**: Owns time bin selector (header) and filter panel
- **Treemap Explorer**: Owns lens selector (header) and filter panel

Global filters (author, file type, event type) are managed by App.tsx and passed to plugins when needed.

---

## Technical Implementation Notes

### Abort Signal Support

Both plugins implement `processDataCancellable()` to support cancellation:

- Checks `signal.aborted` periodically during expensive operations
- Throws `DOMException("AbortError")` when cancelled
- Prevents stale data from rendering after plugin switch

### Data Processing Strategy

**Timeline Heatmap**:

1. Receives raw lifecycle/author/file data from PluginDataLoader
2. Uses `DataProcessor.processRawData()` to build optimized dataset
3. Applies exclusions and directory count limits
4. Aggregates activity into time bins
5. Builds grid with continuous time coverage

**Treemap Explorer**:

1. Receives pre-processed frontend-ready data (project_hierarchy, file_metrics_index)
2. Enriches with health scores and coupling metrics
3. Three separate renderers handle lens-specific visualization
4. D3 treemap layout for hierarchical box display

### Performance Considerations

- Timeline Heatmap: O(n) traversal with abort checks every 100 items
- Treemap Explorer: Lazy loading of temporal data for Evolution lens
- Both: Data processing separated from rendering for cancellability
- Safety limit: 5000 time bins maximum to prevent infinite loops

---

## Appendix: Verification Sources

This document was verified against the following source files:

- `src/App.tsx` - Application structure and plugin lifecycle
- `src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts` - Timeline Heatmap implementation
- `src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx` - Treemap Explorer implementation
- `src/plugins/init.ts` - Plugin registration order
- `src/services/data/DatasetRegistry.ts` - Complete dataset registry
- `src/plugins/timeline-heatmap/components/TimelineHeatmapFilters.tsx` - Filter UI
- `src/types/domain.ts` - Core data type definitions
