# Git Repository Visualization - Phase 3 Implementation

## Overview

This is the **Phase 3** implementation of the Git Repository Evolution Visualization Platform, featuring a complete plugin architecture with two fully functional visualizations:

1. **Timeline Heatmap** (Priority 1) - Repository activity across time and directory structure
2. **Treemap Animation** (Priority 2) - Animated repository structure evolution

## Architecture

### Plugin System

The application is built on a flexible plugin architecture that allows easy addition of new visualizations:

```
src/
├── types/               # TypeScript type definitions
│   ├── domain.ts       # Core domain types
│   ├── visualization.ts # Visualization-specific types
│   └── plugin.ts       # Plugin system interfaces
├── services/           # Business logic layer
│   ├── data/          # Data loading with PapaParse
│   └── processing/    # Data aggregation and transformation
├── store/             # Global state management (Zustand)
├── plugins/           # Visualization plugins
│   ├── core/         # Plugin registry
│   ├── timeline-heatmap/ # Timeline Heatmap plugin
│   └── treemap-animation/ # Treemap Animation plugin
├── components/        # Reusable UI components
├── utils/            # Utility functions
└── App.tsx           # Main application component
```

### Key Features

#### Phase 1 & 2 (Infrastructure)
- ✅ TypeScript with strict mode
- ✅ Type-safe data loading with PapaParse
- ✅ Zustand state management
- ✅ Plugin registry system
- ✅ Shared utilities (date helpers, color scales, formatting)
- ✅ Service layer for data processing

#### Phase 3 (Treemap Animation)
- ✅ Treemap visualization plugin
- ✅ Temporal snapshot generation (monthly/quarterly/yearly)
- ✅ Hierarchical directory structure
- ✅ Animated transitions between time periods
- ✅ Color-coded by change frequency
- ✅ Interactive tooltips and highlighting

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Data Requirements

Place the following CSV files in `public/DATASETS_excalidraw/`:

1. `file_lifecycle_events.csv` - Event-level data
2. `file_lifecycle_summary.csv` - File-level aggregates

### Expected CSV Format

**file_lifecycle_events.csv:**
- file_path, status, commit_hash, commit_datetime, commit_timestamp
- author_name, author_email, commit_subject, old_mode, new_mode
- old_sha, new_sha, old_path (nullable), new_path (nullable), similarity (nullable)

**file_lifecycle_summary.csv:**
- file_path, total_events, added_count, modified_count, deleted_count
- renamed_count, copied_count, type_changed_count
- first_seen, last_seen, first_commit, last_commit

## Usage

### Switching Between Visualizations

Use the plugin selector in the header to switch between:
- **Timeline Heatmap** - See activity patterns over time
- **Treemap Animation** - Watch repository structure evolve

### Timeline Heatmap

**Features:**
- Heatmap cells show activity intensity
- Green dots = file creations
- Red dots = file deletions
- Hover for detailed information
- Top 20 most active directories shown

**Insights:**
- Identify "hot zones" of development
- Spot major refactoring periods
- See dormant areas of codebase
- Track directory-level activity patterns

### Treemap Animation

**Features:**
- Rectangle size = number of events/changes
- Color intensity = change frequency
- Hierarchical directory structure
- Snapshot labels show time period
- Labels on larger cells

**Insights:**
- Watch codebase areas grow/shrink over time
- Identify structural refactoring
- See which parts of codebase are most active
- Understand directory organization evolution

### Export

Click the "Export" button in the header to download the current visualization as SVG.

## Plugin Development

### Creating a New Plugin

```typescript
import { VisualizationPlugin, RawDataset } from '@/types/plugin';

class MyPlugin implements VisualizationPlugin<MyConfig, MyData> {
  metadata = {
    id: 'my-plugin',
    name: 'My Visualization',
    description: 'Description here',
    version: '1.0.0',
    priority: 3,
  };
  
  defaultConfig: MyConfig = { /* ... */ };
  
  init(container: HTMLElement, config: MyConfig): void {
    // Initialize visualization
  }
  
  processData(dataset: RawDataset): MyData {
    // Transform raw data
    return processedData;
  }
  
  render(data: MyData, config: MyConfig): void {
    // Render visualization
  }
  
  update(data: MyData, config: MyConfig): void {
    // Update existing visualization
  }
  
  destroy(): void {
    // Cleanup
  }
  
  async exportImage(): Promise<Blob> {
    // Export as image
  }
  
  exportData(): any {
    // Export data
  }
}
```

### Registering a Plugin

```typescript
import { PluginRegistry } from '@/plugins/core/PluginRegistry';

const myPlugin = new MyPlugin();
PluginRegistry.register(myPlugin);
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **D3.js** - Visualization primitives
- **Zustand** - State management
- **PapaParse** - CSV parsing
- **date-fns** - Date manipulation
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Performance Optimizations

1. **Data Processing**: Pre-aggregation in service layer
2. **Rendering**: SVG-based with D3 for efficiency
3. **Memory**: Cleanup in plugin destroy methods
4. **State**: Minimal re-renders with Zustand selectors

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Future Enhancements (Phase 4+)

- [ ] Multiple dataset support
- [ ] Advanced filtering UI
- [ ] Timeline playback controls
- [ ] Contributor flow diagram (Priority 3)
- [ ] Canvas rendering for large datasets
- [ ] Web Workers for processing
- [ ] Real-time Git integration

## Development Checkpoints

### ✅ Phase 0: Foundation
- Architecture decisions
- Library selection
- Project structure

### ✅ Phase 1: Core Infrastructure
- TypeScript setup
- Type definitions
- Service layer
- State management

### ✅ Phase 2: Plugin System
- Plugin registry
- Timeline Heatmap as plugin
- Shared components
- Export functionality

### ✅ Phase 3: Treemap Animation (CURRENT)
- Treemap plugin implementation
- Snapshot generation (monthly/quarterly/yearly)
- Hierarchical layout with D3
- Color-coded change frequency
- Plugin switching in UI

### 🔲 Phase 4: Multiple Datasets
- Dataset adapter system
- Multiple repository support

### 🔲 Phase 5: Testing & Polish
- Unit tests
- E2E tests
- Documentation
- Performance optimization

### 🔲 Phase 6: Contributor Flow (Optional)
- Sankey diagram
- Author contribution patterns
- Ownership transfer detection

## Success Criteria - Phase 3

- [x] Treemap shows file/directory structure
- [x] Size based on configurable metrics
- [x] Color shows change frequency
- [x] Temporal snapshots generated
- [x] Works as standalone plugin
- [x] Smooth rendering performance
- [x] Integrated into main application
- [x] Both plugins switchable

## License

MIT

## Contributors

Built following the phased evolution plan for production-ready Git repository visualization.
