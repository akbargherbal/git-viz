# Git Repository Visualization (git-viz)

> **Interactive visualizations of Git repository evolution with extensible plugin architecture**

A modern web application for exploring and analyzing Git repository history through multiple visualization lenses. Built with React, TypeScript, and D3.js, git-viz transforms pre-processed repository data into rich, interactive visualizations.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-18.2-blue)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🎯 Overview

git-viz is a **plugin-based visualization platform** that enables multiple perspectives on repository evolution:

- **Timeline Heatmap** - Activity patterns over time with customizable metrics
- **Treemap Structure** - Hierarchical view of repository organization
- **Extensible Plugin System** - Add new visualizations without modifying core code

### Key Features

✨ **Plugin Architecture** - Self-contained visualizations with their own controls  
📊 **Multiple Metrics** - Analyze commits, events, or author activity  
🎨 **Interactive Filtering** - Filter by authors, file types, directories, time ranges  
⚡ **Optimized Performance** - Pre-processed data for instant visualization updates  
🎛️ **Rich Controls** - Each plugin defines its own context-specific UI  
🔍 **Detail Panels** - Drill down into specific data points

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/git-viz.git
cd git-viz

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will open at `http://localhost:3000`

### Dataset Requirements

git-viz consumes pre-processed JSON datasets. Place your dataset in `public/DATASETS_<name>/`:

```
public/DATASETS_myrepo/
├── manifest.json                    # Dataset catalog
├── file_lifecycle.json              # Core lifecycle data
├── metadata/
│   └── file_index.json             # File metadata
├── aggregations/
│   ├── temporal_daily.json         # Daily aggregations
│   └── temporal_monthly.json       # Monthly aggregations
└── networks/
    ├── author_network.json         # Author collaboration
    └── cochange_network.json       # File co-change patterns
```

See [Dataset Format](#-dataset-format) for details.

---

## 🏗️ Architecture

### Plugin-First Design

git-viz uses a **decoupled plugin architecture** where:

1. **App.tsx** handles universal concerns (data loading, plugin orchestration)
2. **Plugins** own their visualization logic + UI controls
3. **Zustand Store** manages shared state (filters, UI state, plugin states)

```
+------------------------------------------------+
|                    App.tsx                     |
|  - Dataset selection                           |
|  - Plugin orchestration                        |
|  - Data loading                                |
+----------------------+-------------------------+
                       |
               +-------+-------+
               |               |
       +-------+------+  +-----+-------+
       |   Timeline   |  |   Treemap   |
       |   Heatmap    |  |   Plugin    |
       |  - Controls  |  |             |
       |  - State     |  |  - Rendering|
       |  - Rendering |  |             |
       +--------------+  +-------------+

```

### Core Systems

#### 1. Plugin Registry (`PluginRegistry.ts`)

Manages plugin lifecycle, validation, and data requirements.

```typescript
// Register plugins
PluginRegistry.register(new TimelineHeatmapPlugin());
PluginRegistry.register(new TreemapPlugin());

// Query plugins
const plugin = PluginRegistry.get("timeline-heatmap");
const requirements = PluginRegistry.getDataRequirements("timeline-heatmap");
```

#### 2. Data Layer (`services/data/`)

- **DatasetRegistry** - Catalog of available datasets and their schemas
- **PluginDataLoader** - Loads required datasets for each plugin
- **DataProcessor** - Transforms and filters raw data

#### 3. State Management (`store/appStore.ts`)

Zustand-based store managing:

- Global filters (authors, file types, time ranges)
- UI state (panels, active plugin)
- Plugin-specific state (isolated by plugin ID)

```typescript
// Plugin state is isolated by ID
const state = useAppStore();
state.setPluginState("timeline-heatmap", { metric: "commits" });
state.setPluginState("treemap", { layout: "squarified" });
```

---

## 🔌 Plugin Development

### Creating a New Plugin

Plugins implement the `VisualizationPlugin` interface:

```typescript
// src/plugins/my-viz/MyPlugin.ts
import { VisualizationPlugin, PluginControlProps } from '@/types/plugin';

export class MyPlugin implements VisualizationPlugin {
  metadata = {
    id: 'my-viz',
    name: 'My Visualization',
    description: 'Custom visualization',
    version: '1.0.0',
    priority: 3,

    // Declare data requirements
    dataRequirements: [
      { dataset: 'temporal_daily', required: true },
      { dataset: 'file_index', required: false }
    ]
  };

  defaultConfig = {
    width: 800,
    height: 600
  };

  // Optional: Initial state for controls
  getInitialState() {
    return {
      viewMode: 'grid',
      sortBy: 'name'
    };
  }

  // Optional: Render plugin-owned controls
  renderControls({ state, updateState, data }: PluginControlProps) {
    return (
      <div className="flex gap-2">
        <select
          value={state.viewMode}
          onChange={(e) => updateState({ viewMode: e.target.value })}
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
        </select>
      </div>
    );
  }

  // Required: Initialize container
  init(container: HTMLElement, config: any) {
    this.container = container;
  }

  // Required: Transform data for rendering
  processData(dataset: OptimizedDataset, config?: any) {
    // Transform data into renderable format
    return transformedData;
  }

  // Required: Render visualization
  render(data: any, config: any) {
    // D3.js or React rendering logic
  }

  // Required: Cleanup
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  // Optional: Export capabilities
  async exportImage(): Promise<Blob> { /* ... */ }
  exportData(): any { /* ... */ }
}
```

### Registering Your Plugin

```typescript
// src/App.tsx
import { MyPlugin } from "@/plugins/my-viz/MyPlugin";

PluginRegistry.register(new MyPlugin());
```

That's it! No App.tsx modifications needed. Your plugin will appear in the selector.

### Plugin Patterns

#### Pattern 1: Plugin with Controls

```typescript
class InteractivePlugin implements VisualizationPlugin {
  getInitialState() { return { param: 'default' }; }
  renderControls({ state, updateState }) { return <Controls />; }
}
```

#### Pattern 2: Plugin without Controls

```typescript
class StaticPlugin implements VisualizationPlugin {
  // No getInitialState or renderControls
  // Just processData and render
}
```

### Data Requirements

Plugins declare their data needs via `dataRequirements`:

```typescript
dataRequirements: [
  {
    dataset: "temporal_daily", // Dataset name
    required: true, // Fail if missing
  },
  {
    dataset: "author_network",
    required: false, // Optional enhancement
  },
];
```

The `PluginDataLoader` automatically loads declared datasets before plugin initialization.

---

## 📦 Dataset Format

### Manifest (`manifest.json`)

```json
{
  "schema_version": "2.0.0",
  "repository_name": "excalidraw",
  "repository_path": "/path/to/repo",
  "generated_at": "2026-01-14T16:04:33+00:00",
  "datasets": [
    {
      "name": "temporal_daily",
      "path": "aggregations/temporal_daily.json",
      "schema_type": "temporal_aggregation",
      "size_bytes": 251392
    }
  ]
}
```

### Core Dataset: `file_lifecycle.json`

```json
{
  "files": {
    "src/App.tsx": [
      {
        "hash": "abc123",
        "timestamp": 1640000000,
        "author": "dev@example.com",
        "operation": "M",
        "changes": { "additions": 10, "deletions": 5 }
      }
    ]
  }
}
```

### Aggregation: `temporal_daily.json`

```json
{
  "schema_version": "2.0.0",
  "aggregation_level": "day",
  "days": [
    {
      "date": "2020-01-02",
      "commits": 37,
      "files_changed": 49,
      "unique_authors": 5,
      "operations": { "M": 30, "A": 15, "D": 4 }
    }
  ]
}
```

See `public/DATASETS_excalidraw/dataset_metadata.md` for full schema documentation.

---

## 🛠️ Technology Stack

### Core

- **React 18** - UI framework
- **TypeScript 5.3** - Type safety
- **Vite 5** - Build tool & dev server
- **Zustand 4** - State management

### Visualization

- **D3.js 7** - Data visualization primitives
- **d3-hierarchy** - Tree/treemap layouts
- **Framer Motion** - UI animations

### Utilities

- **date-fns** - Date manipulation
- **papaparse** - CSV parsing
- **Lucide React** - Icon library

### Development

- **Vitest** - Unit testing
- **TypeScript** - Type checking
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Tailwind CSS** - Utility-first styling

---

## 📂 Project Structure

```
git-viz/
├── src/
│   ├── App.tsx                      # Application shell
│   ├── main.tsx                     # Entry point
│   │
│   ├── plugins/                     # Visualization plugins
│   │   ├── core/
│   │   │   ├── PluginRegistry.ts    # Plugin management
│   │   │   └── __tests__/
│   │   ├── timeline-heatmap/
│   │   │   ├── TimelineHeatmapPlugin.ts
│   │   │   └── components/
│   │   └── treemap-animation/
│   │       └── TreemapPlugin.ts
│   │
│   ├── services/                    # Business logic
│   │   └── data/
│   │       ├── DatasetRegistry.ts   # Dataset catalog
│   │       ├── PluginDataLoader.ts  # Data loading
│   │       ├── DataProcessor.ts     # Data transformation
│   │       └── types.ts
│   │
│   ├── store/                       # State management
│   │   ├── appStore.ts              # Zustand store
│   │   └── __tests__/
│   │
│   ├── components/                  # Reusable components
│   │   ├── common/                  # Shared UI components
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorDisplay.tsx
│   │   │   └── ...
│   │   └── layout/
│   │       └── PluginSelector.tsx
│   │
│   ├── hooks/                       # Custom React hooks
│   │   └── useScrollIndicators.tsx
│   │
│   ├── types/                       # TypeScript definitions
│   │   ├── plugin.ts                # Plugin interfaces
│   │   ├── domain.ts                # Domain models
│   │   └── visualization.ts
│   │
│   └── utils/                       # Utility functions
│       ├── dateHelpers.ts
│       └── formatting.ts
│
├── public/
│   └── DATASETS_*/                  # Pre-processed datasets
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Test Coverage

- ✅ Plugin Registry (registration, validation, requirements)
- ✅ Dataset Registry (schema validation, loading)
- ✅ Plugin State Management (store integration)
- 🚧 Data Processing (in progress)
- 🚧 Component Tests (in progress)

---

## 🎨 Styling & Theming

git-viz uses **Tailwind CSS** with a dark theme optimized for data visualization:

### Color Palette

```css
--zinc-950: #09090b; /* Background */
--zinc-900: #18181b; /* Surface */
--zinc-800: #27272a; /* Border */
--purple-600: #9333ea; /* Accent */
```

### Custom Classes

- `.panel-transition` - Smooth panel animations
- `.panel-hidden` - Collapsed state
- `.sleek-scrollbar` - Minimalist scrollbars

---

## 🚧 Roadmap

### Current (v2.0)

- ✅ Plugin architecture with control ownership
- ✅ Timeline Heatmap visualization
- ✅ Treemap visualization
- ✅ Advanced filtering system
- ✅ Plugin state management

### Planned (v2.1)

- [ ] Network Graph plugin (author collaboration)
- [ ] Code Churn visualization
- [ ] Commit Message analysis
- [ ] Plugin marketplace/discovery

### Future

- [ ] Real-time Git repository analysis
- [ ] Export to static HTML
- [ ] Comparative analysis (multi-repo)
- [ ] Custom plugin templates
- [ ] Layout configuration system (Phase 4)

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-viz`)
3. **Follow the plugin development guide** above
4. **Add tests** for new functionality
5. **Commit your changes** (`git commit -m 'Add amazing visualization'`)
6. **Push to the branch** (`git push origin feature/amazing-viz`)
7. **Open a Pull Request**

### Plugin Contribution Guidelines

- Follow TypeScript strict mode
- Include data requirements in plugin metadata
- Provide default configuration
- Add JSDoc comments for public APIs
- Include usage examples
- Test with multiple datasets

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- **D3.js** - Mike Bostock and contributors
- **React** - Meta and contributors
- **Excalidraw** - Sample dataset source
- Inspired by software archaeology and repository mining research

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/git-viz/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/git-viz/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/git-viz/wiki)

---

## 📊 Project Status

**Current Version:** 2.0.0  
**Status:** Active Development  
**Last Updated:** January 2026

Built with ❤️ for repository visualization and software archaeology
