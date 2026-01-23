### App Overview: Git Repository Evolution Visualizer

**Description:**
This is a sophisticated, interactive data visualization dashboard designed to analyze the history, evolution, and health of a Git repository (specifically using the **Excalidraw** repository as the demo dataset). It uses React, D3.js, and WebGL-like techniques to render large datasets representing file lifecycles, author contributions, and code coupling over time.

**Core Purpose:**
To help developers and engineering managers understand:
1.  **Technical Debt:** Identifying files with high "churn" (frequent changes) and low "bus factor" (few contributors).
2.  **Code Coupling:** Visualizing which files frequently change together to identify hidden dependencies.
3.  **Temporal Evolution:** Watching how the codebase has grown and changed structure over time.

---

### Key Features & Views

The application is built around a **Plugin Architecture**, currently featuring two main visualization plugins:

1.  **Timeline Heatmap:** A temporal grid showing activity intensity across directories over time.
2.  **Treemap Explorer:** A hierarchical view of the file system that changes based on different analytical "Lenses" (Debt, Coupling, Time).

---

### User Journey

#### 1. Initial Load & Dashboard Layout
*   **Action:** The user opens the application.
*   **System Response:** The app initializes the `PluginDataLoader`, fetching cached JSON datasets (file lifecycle, author networks, directory stats). A loading spinner appears, followed by the main dashboard.
*   **Layout:**
    *   **Header:** Displays the repository name ("Excalidraw"), a dropdown to switch Visualizations (Plugins), and a toggle for the Filter Panel.
    *   **Main Canvas:** The central area where the active visualization renders.
    *   **Sidebars:** Collapsible panels on the right for Filters (Authors/File Types) and Details (File specifics).

#### 2. View A: The Timeline Heatmap (Default or Selectable)
*   **Goal:** To see *when* specific parts of the codebase were most active.
*   **Visual:** A table-like heatmap.
    *   **Rows:** Top directories/files.
    *   **Columns:** Time units (Days, Weeks, Months, Quarters).
    *   **Cells:** Colored blocks representing intensity (Commits, Authors, or Events).
*   **User Actions:**
    *   **Changing Metrics:** The user clicks buttons in the header to switch the heat metric between "Commits", "Events", or "Authors".
    *   **Changing Granularity:** The user switches the time bin from "Week" to "Month" to see broader trends.
    *   **Drilling Down:** The user clicks a specific cell (e.g., `src/components` in `Q3 2023`).
    *   **Result:** A **Detail Panel** slides in from the right, showing the exact number of creations, deletions, and modifications for that directory during that specific time period.

#### 3. View B: The Treemap Explorer
*   **Goal:** To analyze the structural health and dependencies of the code.
*   **Visual:** A nested box layout (Voronoi/Treemap style) where box size represents file significance (e.g., commit count).
*   **User Actions - Switching Lenses:**
    *   **Technical Debt Lens:** The user selects "DEBT". Files turn Red (Critical), Yellow (Medium), or Green (Healthy).
        *   *Insight:* The user spots a large Red box. Clicking it reveals it has high churn and is modified by only one person (High Risk).
    *   **Coupling Lens:** The user selects "COUP".
        *   *Interaction:* The user hovers over a file. **Arcs (lines)** appear, connecting that file to other files in the treemap.
        *   *Insight:* This shows "Logical Coupling"—files that are frequently committed together, indicating a dependency that might not be obvious in the code import structure.
    *   **Evolution Lens (Time):** The user selects "TIME".
        *   *Interaction:* A **Timeline Scrubber** appears at the bottom of the screen.
        *   *Animation:* The user presses "Play" or drags the scrubber. The treemap updates dynamically to show the state of the repo at that percentage of history. New files flash Green; dormant files fade to Grey.

#### 4. Filtering Data
*   **Action:** The user clicks the "Filters" button in the top right.
*   **Panel:** A sidebar opens listing all Authors and File Extensions.
*   **Interaction:**
    *   The user searches for a specific developer (e.g., "vjeux").
    *   The user toggles off `.json` and `.md` files to focus only on source code (`.ts`, `.tsx`).
*   **Result:** The main visualization (Heatmap or Treemap) immediately redraws to show data *only* associated with that author and those file types.

#### 5. Deep Dive (Detail Panel)
*   **Action:** In any view, the user clicks on a specific file.
*   **Panel:** The "Detail Panel" opens on the right.
*   **Content:**
    *   **Health Score:** A score out of 100 based on churn, author diversity, and age.
    *   **Stats:** Total commits, unique authors, creation date.
    *   **Coupling Partners:** A list of files that are strongly coupled to the selected file.
    *   **Activity Timeline:** A mini bar chart showing when this specific file was modified.