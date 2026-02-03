## Artifact Analysis

I have analyzed the provided source code. This is a sophisticated **React-based Data Visualization Dashboard** built to analyze Git repository history. It uses **Zustand** for state management, **D3.js** for complex rendering (Treemaps, Arcs), and **Tailwind CSS** for styling.

The application revolves around a "Plugin" architecture with two distinct visualization modes:

1.  **Timeline Heatmap**: A temporal grid showing activity intensity per directory over time.
2.  **Treemap Explorer**: A hierarchical view of the codebase with three distinct "Lenses" (Technical Debt, Coupling, Evolution).

### Detected Data Schema

The app relies on a complex set of JSON datasets:

- **Hierarchy**: `project_hierarchy.json` (Folder structure)
- **Metrics**: `file_metrics_index.json` (Health scores, churn, volume)
- **Network**: `cochange_network.json` (File coupling/dependencies)
- **Lifecycle**: `file_lifecycle.json` (Creation dates, dormancy)
- **People**: `author_network.json` (Contributor stats)

---

## User Journeys

Here are the specific user journeys derived from the code logic:

### 1. The Temporal Overview (Heatmap Analysis)

**Goal**: Identify when and where the most intense development activity occurred.

- **Trigger**: User loads the app (Default view) or selects "Timeline Heatmap" from the top-left dropdown.
- **Steps**:
  1.  User views a matrix where Rows = Directories and Columns = Time (Weeks/Months).
  2.  User toggles the **Metric** control (Commits vs. Events vs. Authors) to change color intensity.
  3.  User changes the **Time Bin** (Week, Month, Quarter) to aggregate data differently.
  4.  User hovers over a specific cell to see a tooltip summary.
  5.  User **clicks a cell** (intersection of a specific folder and date).
- **System Response**: A side panel slides in (`Dy` component) showing:
  - Event composition (Added vs. Modified vs. Deleted).
  - Top contributors for that specific period/folder.
  - Most active files within that folder.

### 2. The Technical Debt Audit (Treemap - Debt Lens)

**Goal**: Find risky files that need refactoring.

- **Trigger**: User switches to "Treemap Explorer" and selects the "DEBT" lens.
- **Steps**:
  1.  User sees a nested box layout where Box Size = Commits/Authors and Color = Health Score (Red = Critical, Green = Healthy).
  2.  User opens the **Filters** panel (`Qf` icon) and checks "Critical Only (Health ≤ 30)".
  3.  User identifies a large red box and clicks it.
- **System Response**: The Detail Panel (`ah` component) opens in "Debt Mode":
  - Displays **Health Score** (0-100).
  - Shows **Churn Rate** (frequency of rewrites).
  - Shows **Bus Factor** (risk of knowledge silos/single author).

### 3. The Dependency Investigation (Treemap - Coupling Lens)

**Goal**: Understand file inter-dependencies before a refactor.

- **Trigger**: User selects the "COUP" (Coupling) lens in Treemap Explorer.
- **Steps**:
  1.  User adjusts the **Coupling Threshold** slider in the settings panel to filter out weak links.
  2.  User toggles "Show Coupling Arcs" to visualize connections as drawn lines (`w2` D3 renderer).
  3.  User clicks on a specific file.
- **System Response**:
  - The Detail Panel shows a list of **Coupled Files** (files that frequently change together).
  - It displays the **Coupling Strength** (0.0 - 1.0).
  - Visual arcs are drawn on the canvas connecting the selected file to its partners.

### 4. The Repository Evolution (Treemap - Time Lens)

**Goal**: Visualize how the codebase grew over time and identify dormant code.

- **Trigger**: User selects the "TIME" (Evolution) lens in Treemap Explorer.
- **Steps**:
  1.  A **Timeline Scrubber** (`v2` component) appears at the bottom of the screen.
  2.  User presses **Play** or drags the scrubber.
  3.  User toggles "Highlight New Files" or "Fade Dormant Files" in settings.
- **System Response**:
  - The Treemap updates dynamically.
  - New files flash **Green** as they appear in the timeline.
  - Old, untouched files fade to **Dark Grey** (Dormant status).
  - The Detail Panel shows the file's "Age" and "Last Modified" dates.

### 5. The Contributor Deep Dive (Global Filtering)

**Goal**: Analyze the impact of a specific developer or file type.

- **Trigger**: User clicks the Filter toggle button.
- **Steps**:
  1.  User types a name in the **Author Search** box.
  2.  User selects specific authors (e.g., "John Doe").
  3.  User selects specific file extensions (e.g., `.ts`, `.tsx`).
- **System Response**:
  - The visualization (Heatmap or Treemap) immediately redraws.
  - Data points not matching the selected authors/extensions are hidden or zeroed out.
  - A badge on the filter icon shows the count of active filters.

### 6. Navigation & Export

**Goal**: Explore large datasets or save findings.

- **Steps**:
  1.  **Panning**: User drags the canvas (if zoomed in) or uses the custom arrow overlays (`Ty` component) on the edges of the screen.
  2.  **Zooming**: User uses the mouse wheel to zoom in/out of the Treemap.
  3.  **Error Recovery**: If a dataset fails to load, an Error Boundary (`by` component) appears, allowing the user to dismiss and retry.
