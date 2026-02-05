# Git Repository Evolution

**Git Repository Evolution** is an advanced, interactive visualization suite designed to analyze the lifecycle, architectural health, and social dynamics of software repositories. It transforms static Git metadata into dynamic, navigable visualizations, allowing developers and architects to identify technical debt, coupling patterns, and historical trends.

## 🚀 Key Features

- **Multi-Perspective Analysis**: Switch seamlessly between high-level temporal views and deep architectural dives.
- **Interactive Visualizations**: Built with D3.js and React, offering smooth zooming, panning, and drill-down capabilities.
- **Plugin-Based Architecture**: Visualizations are loaded as independent plugins, allowing for modular expansion.
- **Static Data Consumption**: Designed to run client-side by consuming pre-processed JSON datasets, removing the need for a live backend server during analysis.

---

## 📊 Visualizations

The application currently features two primary visualization plugins:

### 1. Timeline Heatmap

A temporal grid visualizing development activity across the directory structure.

- **X-Axis**: Time (temporal aggregation based on available datasets).
- **Y-Axis**: Top directories by activity score.
- **Cells**: Color intensity represents commit volume.
- **Interactions**:
  - Click cells to see specific commit counts, event types (Added/Modified/Deleted), and top contributors for that period.
  - Filter out specific directories to reduce noise.

### 2. Treemap Explorer

A hierarchical view of the codebase where file size represents metric volume (Commits or Authors). This view offers three distinct **"Lenses"**:

#### A. 🔴 Technical Debt Lens

Focuses on code health and maintenance risks.

- **Color Scale**: Green (Healthy) to Red (Critical).
- **Metrics**: Calculates a "Health Score" based on **Churn Rate** (frequency of changes), **Bus Factor** (author diversity), and **Age**.
- **Use Case**: Identifying unstable files that require refactoring.

#### B. 🟣 Coupling Lens

Visualizes logical dependencies between files based on co-change history.

- **Visuals**: Draws arcs between files that frequently change together.
- **Thresholding**: Adjustable slider to filter out weak connections, revealing only strong architectural dependencies.
- **Use Case**: Spotting "God Objects" or tight coupling that hinders modularity.

#### C. 🔵 Time Lens

A playback-enabled view of the repository's history.

- **Timeline Scrubber**: Drag or play through the project's history from start to finish.
- **Visuals**: Files appear when created, show activity through the timeline, and fade when dormant.
- **Use Case**: Understanding how the architecture grew over time.

---

## 🛠 Technical Architecture

### Stack

- **Core**: React 18 (Functional components, Hooks).
- **State Management**: Zustand (Lightweight, decoupled state).
- **Visualization**: D3.js (Complex SVG rendering, scales, layouts).
- **Animation**: Framer Motion (Smooth UI transitions).
- **Styling**: Tailwind CSS (Utility-first styling).
- **Build**: Vite.

### Data Pipeline

The application does not query Git directly. Instead, it expects a set of pre-processed JSON datasets located in the `public/DATASETS_{repo_name}/` directory.

**Core Dataset Files:**

Located in `public/DATASETS_{repo_name}/`:

1. **frontend/project_hierarchy.json**: Directory tree structure.
2. **frontend/file_metrics_index.json**: Pre-computed health scores and coupling stats.
3. **metadata/file_index.json**: File metadata (authors, creation dates).
4. **file_lifecycle.json**: Event stream (Add/Modify/Delete events).
5. **networks/author_network.json**: Contributor identity and collaboration data.
6. **networks/cochange_network.json**: Edge list for file coupling.
7. **aggregations/temporal_daily.json**: Aggregated daily stats for the timeline scrubber.

**Additional Dataset Files:**

- **aggregations/temporal_monthly.json**: Monthly aggregated temporal data.
- **aggregations/directory_stats.json**: Directory-level statistics.
- **frontend/temporal_activity_map.json**: Temporal activity mapping.
- **milestones/release_snapshots.json**: Release milestone data.
- **manifest.json**: Dataset manifest and metadata.
- **dataset_metadata.md**: Human-readable dataset documentation.

---

## 🕹️ User Interactions

### Global Controls

- **Visualization Selector**: Top-left dropdown to switch between Heatmap and Treemap.
- **Filter Toggle**: Top-right button to open the configuration sidebar.

### Navigation

- **Panning**: Click and drag on the canvas, or use the on-screen arrow overlays that appear at the viewport edges.
- **Zooming**: Browser-native zoom (Ctrl/Cmd + scroll or pinch gestures).

### Detail Panels

Clicking on any data point (a file in the Treemap or a cell in the Heatmap) opens a **Contextual Sidebar** on the right.

- **Sparklines**: Shows activity over time for the selected file.
- **Stats**: Exact numbers for commits, authors, and churn.
- **Relationships**: Lists coupled files and their strength percentages.

---

## 📦 Setup & Running

1.  **Install Dependencies**:

    ```bash
    npm install
    # or
    pnpm install
    ```

2.  **Build**:

    ```bash
    npm run build
    # or
    pnpm build
    ```

3.  **Data Placement**: Ensure your generated JSON datasets are placed in the `public/DATASETS_{repo_name}/` folder with the structure described above.

4.  **Development Server**:

    ```bash
    npm run dev
    # or
    pnpm dev
    ```

5.  **Preview Production Build**:
    ```bash
    npm run preview
    # or
    pnpm preview
    ```

---

## 🧩 Extending

New visualizations can be added by creating a class that implements the Plugin interface (defining `metadata`, `init`, `render`, `update`, and `destroy`) and registering it via `PluginRegistry.register()`.

The plugin system supports:

- Declarative data requirements (required and optional datasets)
- Automatic data validation
- Abort signal support for cancellable operations
- Lifecycle hooks for resource management

---

## 🧪 Testing

The project includes comprehensive test coverage (72.56% statement coverage, 284 tests):

```bash
# Run all tests
npm run test
# or
pnpm test

# Run tests with coverage
npm run test:coverage
# or
pnpm test:coverage

# Run tests in watch mode
npm run test:watch
# or
pnpm test:watch
```

---

## 📈 Test Statistics

- **Test Files**: 27 passed
- **Total Tests**: 284 passed
- **Coverage**:
  - Statements: 72.56%
  - Branches: 63.43%
  - Functions: 73.4%
  - Lines: 74%

---

## 🏗️ Architecture Highlights

### Plugin System

Each visualization plugin:

- Declares its data requirements explicitly
- Supports cancellable data processing via AbortSignal
- Manages its own state independently
- Provides UI controls, filters, and detail panels
- Can be hot-reloaded during development

### State Management

- **Zustand Store**: Global state for data, filters, UI, and plugin states
- **Plugin-Owned State**: Each plugin maintains its own configuration
- **Separation of Concerns**: Processing state vs. rendering state clearly delineated

### Data Processing Pipeline

1. **Load**: Fetch required datasets based on plugin requirements
2. **Validate**: Check data availability and plugin compatibility
3. **Process**: Transform raw data into visualization-ready format (cancellable)
4. **Render**: Display visualization using D3.js and React

---

## 🔧 Configuration

### Treemap Explorer Configuration

```typescript
{
  lensMode: "debt" | "coupling" | "time",
  sizeMetric: "commits" | "authors" | "events",
  healthThreshold: number,        // Debt lens
  couplingThreshold: number,      // Coupling lens
  showArcs: boolean,              // Coupling lens
  timePosition: number,           // Time lens (0-100)
  playing: boolean,               // Time lens playback
  timeFilters: {
    showCreations: boolean,
    fadeDormant: boolean
  }
}
```

### Timeline Heatmap Configuration

```typescript
{
  metric: "commits",
  timeBin: "day" | "week" | "month",
  directoryCount: number,
  excludedDirectories: string[]
}
```

---

## 📚 Additional Documentation

- **Testing Strategy**: See `docs/TESTING_STRATEGY/`
- **Architecture Diagrams**: See `docs/MERMAID_DIAGRAM/`
- **Component Analysis**: See `docs/app-structure/`

---

## 🤝 Contributing

To add a new visualization plugin:

1. Create a class implementing `VisualizationPlugin<TConfig, TData, TState>`
2. Define `metadata` including data requirements
3. Implement lifecycle methods: `init()`, `processData()`, `render()`, `destroy()`
4. (Optional) Implement control ownership: `getInitialState()`, `renderControls()`, `renderFilters()`
5. Register in `src/plugins/init.ts`

Example:

```typescript
import { PluginRegistry } from "@/plugins/core/PluginRegistry";
import { MyNewPlugin } from "./MyNewPlugin";

const myPlugin = new MyNewPlugin();
PluginRegistry.register(myPlugin);
```

---

## 📄 License

See LICENSE file for details.

---

## 🙏 Acknowledgments

Built with modern web technologies and best practices for performance, maintainability, and extensibility.
