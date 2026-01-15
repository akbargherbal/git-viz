# Understanding Check

## What I see you're building

A **Git repository visualization platform** that started as a focused timeline heatmap tool and is evolving into a multi-visualization system. You're pivoting from a single-purpose tool to a plugin-based architecture where different visualizations can coexist and leverage rich, pre-computed datasets.

## Key constraints I'm respecting

- **No backend (short-term)**: All data served from public folder as static JSON
- **POC origins**: Timeline heatmap is mature; newer visualizations like treemap are nascent
- **V2 dataset upgrade**: You've moved computation upstream - frontend no longer needs to derive/calculate data
- **Real-world momentum**: You need to ship new visualizations without rewriting what works

## Trade-offs I recognize

- **Plugin architecture exists but might be underutilized** - You laid the foundation, but the treemap being "static/inactive" suggests the plugin interface isn't fully enabling new visualizations yet
- **Centralized vs distributed data loading** - A single DataLoader made sense for one viz; now it might be creating friction for adding diverse visualizations
- **State management scope** - A single appStore worked initially, but as plugins multiply, this could become a bottleneck

---

# Core Strengths

## 1. **Plugin architecture foundation is EXACTLY right**

You made the correct architectural bet. Having `PluginRegistry.ts` and organizing visualizations as plugins is the path to scaling. This is not premature abstraction - this is appropriate foresight for a multi-viz platform.

## 2. **V2 dataset richness is a massive unlock**

Moving computation upstream is brilliant. You have:

- Pre-aggregated temporal data (daily/monthly)
- Network graphs ready to render (author/cochange)
- Directory statistics pre-calculated
- File metadata indexed

This means **new visualizations should be trivial to add** - just wire up the right dataset. The fact that this isn't happening yet means the _connection layer_ needs evolution, not the data.

## 3. **Separation of concerns is solid**

Your folder structure (`components/`, `services/`, `plugins/`, `types/`) shows good instincts. You're not throwing everything in one place. This discipline will pay dividends.

---

# High-Impact Opportunities

## 1. **Make plugins self-sufficient data consumers**

### Why this matters

Right now, the treemap is "static/inactive" likely because there's friction in getting it the data it needs. If each plugin could declare "I need `directory_stats.json`" and the system automatically provides it, adding new visualizations becomes copy-paste-customize.

### Current approach

I suspect you have something like this:

```typescript
// DataLoader.ts - centralized, knows about all datasets
export class DataLoader {
  async loadAllData() {
    // Loads everything, or specific datasets
    const temporal = await fetch('/public/.../temporal_daily.json');
    const directory = await fetch('/public/.../directory_stats.json');
    // ...
    return { temporal, directory, ... };
  }
}

// appStore.ts - global state with all data
interface AppState {
  data: AllDataTypes; // Big blob
  activePlugin: string;
  // ...
}
```

### Suggested evolution

```typescript
// plugins/core/PluginManifest.ts
export interface PluginDataRequirement {
  dataset: string; // e.g., 'temporal_daily', 'directory_stats'
  required: boolean;
  transform?: (raw: any) => any; // Optional plugin-specific transform
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  dataRequirements: PluginDataRequirement[];
  component: React.ComponentType<PluginProps>;
}

// plugins/core/PluginRegistry.ts (enhanced)
export class PluginRegistry {
  private plugins = new Map<string, PluginManifest>();

  register(manifest: PluginManifest) {
    this.plugins.set(manifest.id, manifest);
  }

  getDataRequirements(pluginId: string): PluginDataRequirement[] {
    return this.plugins.get(pluginId)?.dataRequirements || [];
  }
}

// services/data/DatasetRegistry.ts (NEW)
export class DatasetRegistry {
  private static datasets = {
    temporal_daily: "/DATASETS_excalidraw/aggregations/temporal_daily.json",
    temporal_monthly: "/DATASETS_excalidraw/aggregations/temporal_monthly.json",
    directory_stats: "/DATASETS_excalidraw/aggregations/directory_stats.json",
    file_index: "/DATASETS_excalidraw/metadata/file_index.json",
    author_network: "/DATASETS_excalidraw/networks/author_network.json",
    cochange_network: "/DATASETS_excalidraw/networks/cochange_network.json",
    // ... all your V2 datasets
  };

  static getPath(datasetId: string): string | null {
    return this.datasets[datasetId] || null;
  }

  static listAvailable(): string[] {
    return Object.keys(this.datasets);
  }
}

// services/data/PluginDataLoader.ts (NEW - replaces centralized DataLoader)
export class PluginDataLoader {
  private cache = new Map<string, any>();

  async loadForPlugin(
    requirements: PluginDataRequirement[]
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    for (const req of requirements) {
      const path = DatasetRegistry.getPath(req.dataset);
      if (!path && req.required) {
        throw new Error(`Required dataset '${req.dataset}' not found`);
      }

      if (path) {
        // Check cache first
        if (!this.cache.has(req.dataset)) {
          const response = await fetch(path);
          const raw = await response.json();
          this.cache.set(req.dataset, raw);
        }

        let dataset = this.cache.get(req.dataset);

        // Apply plugin-specific transform if provided
        if (req.transform) {
          dataset = req.transform(dataset);
        }

        data[req.dataset] = dataset;
      }
    }

    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### How plugins use this

```typescript
// plugins/timeline-heatmap/TimelineHeatmapPlugin.ts
export const TimelineHeatmapManifest: PluginManifest = {
  id: "timeline-heatmap",
  name: "Timeline Heatmap",
  description: "Daily commit activity heatmap",
  dataRequirements: [
    {
      dataset: "temporal_daily",
      required: true,
      transform: (raw) => {
        // Plugin-specific data shaping if needed
        return raw.days.map((d) => ({
          date: d.date,
          value: d.commits,
          files: d.files_changed,
        }));
      },
    },
  ],
  component: TimelineHeatmapView,
};

// plugins/treemap-animation/TreemapPlugin.ts
export const TreemapManifest: PluginManifest = {
  id: "treemap",
  name: "Directory Treemap",
  description: "Hierarchical view of repository structure",
  dataRequirements: [
    {
      dataset: "directory_stats",
      required: true,
      transform: (raw) => {
        // Transform flat directory list into hierarchy
        return buildHierarchy(raw.directories);
      },
    },
    {
      dataset: "file_index",
      required: false, // Optional - for enhanced tooltips
    },
  ],
  component: TreemapView,
};
```

### What this unlocks

- **Adding a new visualization takes 5 minutes**: Copy a plugin template, declare data needs, done
- **Plugins are portable**: Each plugin is self-contained with its own data requirements
- **No more central bottleneck**: You don't update DataLoader every time you add a visualization
- **Smart caching**: Data is cached, multiple plugins can share datasets efficiently
- **V2 dataset leverage**: Plugins directly consume rich, pre-computed data without transformation friction

### Migration path

1. **Phase 1**: Create `DatasetRegistry` and `PluginDataLoader` (no breaking changes)
2. **Phase 2**: Enhance `PluginManifest` to include `dataRequirements`
3. **Phase 3**: Refactor timeline-heatmap to use new pattern (proves it works)
4. **Phase 4**: Activate treemap using new pattern (shows scalability)
5. **Phase 5**: Deprecate old centralized DataLoader

---

## 2. **Plugin-scoped state management**

### Why this matters

A single `appStore.ts` will become unwieldy as you add more plugins. Each plugin should manage its own state (filters, selections, UI state) while global state handles plugin switching and shared UI.

### Current approach (assumed)

```typescript
// store/appStore.ts
interface AppState {
  // Global
  activePlugin: string;

  // Timeline-specific (shouldn't be here)
  selectedCell: CellData | null;
  timelineFilters: FilterState;

  // Treemap-specific (shouldn't be here either)
  selectedNode: NodeData | null;
  treemapZoomLevel: number;

  // This grows unbounded as you add plugins
}
```

### Suggested evolution

```typescript
// store/appStore.ts (slimmed down to global concerns)
interface AppState {
  // Global state only
  activePluginId: string | null;
  availablePlugins: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setActivePlugin: (id: string) => void;
  setError: (error: string | null) => void;
}

// types/plugin.ts (enhanced)
export interface PluginProps {
  data: Record<string, any>; // Loaded data from requirements
  pluginState: PluginStateHook; // Plugin-specific state management
}

export interface PluginStateHook {
  getState: <T>() => T;
  setState: <T>(state: T | ((prev: T) => T)) => void;
  resetState: () => void;
}

// hooks/usePluginState.ts (NEW)
export function usePluginState<T>(
  pluginId: string,
  initialState: T
): PluginStateHook {
  const [state, setState] = useState<T>(initialState);

  useEffect(() => {
    // Reset when plugin changes
    const unsubscribe = useAppStore.subscribe(
      (state) => state.activePluginId,
      (activeId) => {
        if (activeId !== pluginId) {
          setState(initialState);
        }
      }
    );
    return unsubscribe;
  }, [pluginId, initialState]);

  return {
    getState: () => state,
    setState: setState as any,
    resetState: () => setState(initialState),
  };
}
```

### How plugins use this

```typescript
// plugins/timeline-heatmap/components/TimelineHeatmapView.tsx
interface TimelineState {
  selectedCell: CellData | null;
  filters: FilterConfig;
  zoomLevel: number;
}

export function TimelineHeatmapView({ data, pluginState }: PluginProps) {
  const state = pluginState as PluginStateHook<TimelineState>;
  const { selectedCell, filters, zoomLevel } = state.getState();

  const handleCellClick = (cell: CellData) => {
    state.setState({ ...state.getState(), selectedCell: cell });
  };

  // Rest of component logic...
}
```

### What this unlocks

- **Clean separation**: Global concerns stay global, plugin concerns stay local
- **No store pollution**: Adding a plugin doesn't bloat the main store
- **Easy debugging**: Each plugin's state is isolated and inspectable
- **Plugin independence**: Plugins can't accidentally affect each other's state

---

## 3. **Leverage manifest.json for plugin discoverability**

### Why this matters

You already have `/public/DATASETS_excalidraw/manifest.json`. This file should become the **source of truth** for what data exists and what plugins are available. Make the system self-documenting.

### Suggested evolution

```typescript
// public/DATASETS_excalidraw/manifest.json (enhanced)
{
  "version": "2.0.0",
  "repository": "excalidraw",
  "generated_at": "2026-01-14T16:04:33.158151+00:00",

  "datasets": {
    "temporal_daily": {
      "path": "/aggregations/temporal_daily.json",
      "type": "time_series",
      "description": "Daily commit activity",
      "size_bytes": 251392,
      "record_count": 1384,
      "schema": {
        "key": "string",
        "date": "ISO8601",
        "commits": "integer",
        "files_changed": "integer",
        "unique_authors": "integer"
      }
    },
    "directory_stats": {
      "path": "/aggregations/directory_stats.json",
      "type": "hierarchical",
      "description": "Directory-level aggregated statistics",
      "size_bytes": 871656,
      "record_count": 3030
    },
    // ... all datasets
  },

  "suggested_visualizations": [
    {
      "type": "timeline",
      "datasets": ["temporal_daily", "temporal_monthly"]
    },
    {
      "type": "treemap",
      "datasets": ["directory_stats", "file_index"]
    },
    {
      "type": "network",
      "datasets": ["author_network", "cochange_network"]
    }
  ]
}
```

### What this unlocks

- **Dynamic dataset loading**: Read manifest, discover what's available
- **Validation**: Check dataset compatibility before loading
- **Plugin suggestions**: System can suggest which plugins work with available data
- **Documentation**: Manifest becomes living documentation of data structure

---

# Optional Enhancements

These are lower priority but will become valuable as the system matures:

## 1. **Plugin lazy loading**

Once you have 5+ plugins, bundle size matters. Use dynamic imports:

```typescript
// plugins/core/PluginRegistry.ts
export interface PluginManifest {
  // ... existing fields ...
  loader: () => Promise<{ default: React.ComponentType<PluginProps> }>;
}

// Usage
register({
  id: "timeline-heatmap",
  // ... other fields ...
  loader: () => import("./timeline-heatmap/TimelineHeatmapView"),
});
```

## 2. **Plugin error boundaries**

Isolate plugin failures so one broken plugin doesn't crash the app:

```typescript
// components/layout/PluginContainer.tsx
function PluginContainer({ plugin, data }: Props) {
  return (
    <ErrorBoundary fallback={<PluginErrorView pluginId={plugin.id} />}>
      <plugin.component data={data} />
    </ErrorBoundary>
  );
}
```

## 3. **URL state for plugins**

Save selected plugin and state in URL for shareability:

```typescript
// hooks/usePluginFromURL.ts
export function usePluginFromURL() {
  const [params, setParams] = useSearchParams();
  const pluginId = params.get("plugin") || "timeline-heatmap";

  const setActivePlugin = (id: string) => {
    setParams({ plugin: id });
  };

  return { pluginId, setActivePlugin };
}
```

---

# What to Keep Doing

1. **Your dataset evolution strategy is excellent** - Keep moving computation upstream. The more pre-computed data you provide, the easier new visualizations become.

2. **Component extraction discipline** - Your `/components/common` folder shows good instincts. Keep extracting reusable UI components.

3. **TypeScript typing** - You're typing your domain properly. This will prevent bugs as complexity grows.

---

# Migration Roadmap

Here's how to evolve incrementally without disrupting the working timeline heatmap:

### Week 1: Foundation

- [ ] Create `DatasetRegistry` (catalog of available datasets)
- [ ] Create `PluginDataLoader` (loads data based on requirements)
- [ ] Enhance `PluginManifest` interface (add `dataRequirements`)

### Week 2: Proof of Concept

- [ ] Refactor timeline-heatmap to use new data loading pattern
- [ ] Verify everything still works (no functionality lost)
- [ ] Add basic plugin state management hook

### Week 3: Activation

- [ ] Implement treemap using new pattern (shows it scales)
- [ ] Extract plugin-scoped state from appStore
- [ ] Document the plugin creation pattern

### Week 4: Polish

- [ ] Add dataset manifest parsing
- [ ] Create plugin error boundaries
- [ ] Add plugin selection UI improvements

---

# Success Metrics

You'll know this evolution is working when:

✅ **New plugins take < 1 hour to scaffold** - From idea to working visualization
✅ **The treemap becomes active** - If it doesn't, the pattern needs adjustment
✅ **Adding a third plugin feels trivial** - The pattern is proven
✅ **State management doesn't grow with plugins** - Plugin state stays isolated
✅ **You're excited to add more visualizations** - Low friction = high momentum

---

# Final Thoughts

Your codebase is at a **critical inflection point**. You have:

- ✅ The right architectural foundation (plugins)
- ✅ Rich, pre-computed datasets (V2)
- ✅ One mature visualization (timeline heatmap)
- ❌ Friction preventing the second visualization from activating (treemap)

The recommendations above focus on **removing that friction**. Once plugins can declare "I need this data" and the system provides it automatically, you'll be able to add visualizations at a rapid pace. The V2 dataset richness you've created upstream is a **force multiplier** waiting to be unleashed - you just need to make the connection layer match that quality.

You're not far from having a truly extensible platform. Focus on making the treemap active using the new pattern, and the path forward will become clear.

**You're building something genuinely useful. Let's make it easier to grow.**
