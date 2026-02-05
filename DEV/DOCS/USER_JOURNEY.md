## Artifact Analysis

Based on the provided source code, I have analyzed the application structure, state management, and UI components. Here is the breakdown of the **Git Repository Evolution** application.

### **Detected Layout**
- **Header**: Contains the app title, a **Visualization Selector** (Dropdown), and a **Global Toolbar** (Time binning, Filter toggle).
- **Main Canvas**: A large, scrollable area (`<main>`) rendering D3.js visualizations (Heatmap or Treemap). It includes custom overlay scroll controls.
- **Right Sidebar (Dynamic)**:
    - **Filter Panel**: Configuration specific to the active visualization (sliders, checkboxes).
    - **Detail Panel**: Context-aware details that slide in when a data point (file or cell) is clicked.
- **Bottom Overlay**: A **Timeline Scrubber** that appears specifically when the "Evolution" lens is active in the Treemap.

### **Key Interactions**
- **Visualization Switching**: Toggling between "Timeline Heatmap" and "Treemap Explorer".
- **Lens Switching**: Inside Treemap, switching between "Technical Debt", "Coupling", and "Evolution".
- **Drill-down**: Clicking a heatmap cell or treemap node opens a detailed side panel.
- **Playback**: A play/pause mechanism for animating the repository history.

### **Data Schema (Inferred)**
The app relies on a complex set of JSON datasets (`file_lifecycle`, `author_network`, `file_metrics`, etc.). The UI consumes aggregated objects looking like:
```json
{
  "path": "src/components/App.js",
  "healthScore": { "score": 45, "category": "medium", "churnRate": 0.6 },
  "couplingMetrics": { "maxStrength": 0.8, "coupledFiles": [...] },
  "activityTimeline": [{ "date": "2023-01-01", "commits": 5 }],
  "stats": { "total_commits": 150, "unique_authors": 3 }
}
```

---

## User Journeys

Here are the distinct user journeys a user goes through when interacting with this web application:

### 1. The "High-Level Overview" Journey (Timeline Heatmap)
*   **Entry**: User loads the app. The **Timeline Heatmap** loads by default.
*   **Navigation**: User uses the custom on-screen arrow overlays or mouse drag to pan across a large grid of Directories (rows) vs. Time (columns).
*   **Configuration**:
    *   User clicks the **Time Bin** selector in the header to group columns by "Week", "Month", or "Quarter".
    *   User opens the **Filter Panel** to adjust the "Number of Directories" slider (5 to 100) to reduce noise.
*   **Investigation**:
    *   User spots a "hot" cell (bright red/orange indicating high activity).
    *   User **clicks the cell**.
    *   **Detail Panel** slides in showing:
        *   Exact commit count, author count, and event composition (Added vs. Deleted vs. Modified).
        *   "Top Contributors" for that specific time/directory.
        *   "Most Active Files" list.

### 2. The "Code Health" Audit (Treemap - Debt Lens)
*   **Switching Context**: User clicks the Visualization Selector (top left) and chooses **"Treemap Explorer"**.
*   **Lens Selection**: User ensures the **"Technical Debt"** lens is active (default).
*   **Visual Scan**: User sees a nested box layout where:
    *   **Size** = Total Commits (or Authors, togglable via header).
    *   **Color** = Health Score (Green = Healthy, Red = Critical).
*   **Filtering**: User opens the Filter Panel and toggles **"Critical Only"** to hide healthy files.
*   **Deep Dive**:
    *   User clicks a large red block.
    *   **Detail Panel** opens showing:
        *   Health Score (e.g., 30/100).
        *   Risk factors: "Churn Rate" (high modifications) and "Bus Factor" (low author diversity).
        *   Lifecycle status (Active vs. Dormant).

### 3. The "Dependency Discovery" Journey (Treemap - Coupling Lens)
*   **Lens Selection**: User switches the Treemap lens to **"Coupling Analysis"**.
*   **Visual Feedback**: The color scale changes to purple (indicating coupling strength).
*   **Interaction**:
    *   User hovers over a file.
    *   **Arcs (Curved Lines)** appear, connecting the hovered file to other files it frequently changes with.
*   **Refinement**:
    *   User opens Filters and adjusts the **"Coupling Strength Threshold"** slider.
    *   Weak connections disappear, leaving only strong architectural dependencies.
*   **Analysis**:
    *   User clicks a file.
    *   **Detail Panel** lists specific "Coupling Partners" sorted by strength (e.g., "Very High - 90%").

### 4. The "Time Travel" Journey (Treemap - Evolution Lens)
*   **Lens Selection**: User switches the Treemap lens to **"Evolution"**.
*   **Interface Change**: A **Timeline Scrubber** bar appears at the bottom of the screen.
*   **Playback**:
    *   User presses the **Play button**.
    *   The Treemap animates: Files pop in (green) as they are created and fade to grey/dark as they become dormant.
*   **Manual Scrubbing**:
    *   User pauses and drags the slider to a specific date (e.g., "Jan 2022").
    *   User toggles **"Highlight New Files"** in the filter panel to easily spot code introduced at that specific time.
*   **History Check**:
    *   User clicks a file.
    *   **Detail Panel** shows an "Activity Timeline" sparkline graph, visualizing the file's commit history over its entire lifespan.


---

### 1. Shared / Core Datasets
These are used by multiple views or are fundamental to the file metadata.
*   **`file_index`**: Contains file-level metadata, primary authors, and basic statistics.
*   **`file_lifecycle`**: Contains the complete event stream (creations, modifications, deletions) for files.

### 2. Timeline Heatmap Specific
Used specifically to generate the directory-over-time visualization.
*   **`author_network`**: Used to map author IDs to names and calculate contributor stats.
*   **`directory_stats`**: Pre-aggregated statistics for the directory hierarchy rows.

### 3. Treemap Explorer Specific
Used to generate the nested box visualization and its specific lenses (Debt, Coupling, Evolution).
*   **`project_hierarchy`**: The complete directory tree structure used to build the D3 treemap layout.
*   **`file_metrics_index`**: Contains the calculated health scores, churn rates, and bus factors.
*   **`cochange_network`**: Used specifically for the **Coupling Lens** to draw arcs and calculate dependency strength.
*   **`temporal_daily`**: Used specifically for the **Evolution Lens** to drive the timeline scrubber and animation.
*   **`temporal_activity_map`**: Listed as an optional requirement for the Treemap, likely for detailed sparklines.

---

### Datasets Registered but NOT Used
The following datasets appear in the registry (`Yf` class) but are **not** requested by any active plugin in the provided code:
*   `temporal_monthly`
*   `release_snapshots`

---