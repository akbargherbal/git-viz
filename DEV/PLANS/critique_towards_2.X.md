# Understanding Check

**What I see you're building**: A multi-visualization platform for Git repository analysis that started as a timeline heatmap and is now evolving to support multiple interactive visualizations. You're at a critical architectural crossroads: how to scale the control/filter system without coupling every plugin to the same interface.

**Key constraints I'm respecting**: 
- No backend (static datasets in public folder)
- Heatmap timeline is feature-complete and locked
- Need to ship new visualizations quickly
- Data loading architecture is already working well

**Trade-offs I recognize**: 
- You built a plugin architecture early (smart!)
- Controls are currently universal but becoming a bottleneck
- The current coupling to App.tsx works for one visualization but won't scale
- You're prioritizing flexibility for future visualizations over optimizing the existing one

---

## Core Strengths

1. **Plugin architecture foundation is excellent** - You have the right abstraction layer (`PluginRegistry`, clear plugin interface). This is the hardest part and you've already solved it. Most developers would be stuck with a monolithic visualization component right now.

2. **Data layer is well-separated** - `DatasetRegistry`, `PluginDataLoader`, and the services layer are clean and decoupled. Adding new data sources or transformations will be straightforward.

3. **You're asking the right question at the right time** - Recognizing the control layer as the next bottleneck *before* adding 5 more plugins is the mark of experienced architectural thinking. Many developers would have copy-pasted App.tsx logic into chaos first.

---

## High-Impact Opportunities

### 1. Let Plugins Own Their Controls

**Why this matters**: Right now, adding a new visualization requires modifying `App.tsx` to add conditional logic for new filters/controls. By the time you have 5 plugins, App.tsx will be an unmaintainable mess of switch statements. This change makes each plugin completely self-contained.

**Current approach**: App.tsx renders universal controls (MetricSelector, TimeBinSelector, FilterPanel) and passes state to plugins

**Suggested evolution**: Split controls into **App-level** (dataset/plugin selection) and **Plugin-level** (everything else)

```typescript
// src/types/plugin.ts - Enhanced plugin interface
export interface Plugin {
  id: string;
  name: string;
  description: string;
  supportedDatasets: string[];
  
  // NEW: Plugin provides its own controls
  renderControls?: (props: PluginControlProps) => React.ReactNode;
  
  // Existing render method
  render: (props: PluginRenderProps) => React.ReactNode;
  
  // NEW: Plugin manages its own state
  getInitialState?: () => Record<string, unknown>;
}

export interface PluginControlProps {
  // Plugin-specific state from store
  state: Record<string, unknown>;
  // Function to update plugin state
  updateState: (updates: Record<string, unknown>) => void;
  // Available data for controls to use
  data: ProcessedDataset;
}
```

```typescript
// src/store/appStore.ts - Add plugin state management
interface AppState {
  currentDataset: string | null;
  currentPlugin: string | null;
  
  // NEW: Each plugin gets its own state slice
  pluginStates: Record<string, Record<string, unknown>>;
  
  setPluginState: (pluginId: string, updates: Record<string, unknown>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // ... existing state ...
  pluginStates: {},
  
  setPluginState: (pluginId, updates) =>
    set((state) => ({
      pluginStates: {
        ...state.pluginStates,
        [pluginId]: {
          ...state.pluginStates[pluginId],
          ...updates,
        },
      },
    })),
}));
```

```typescript
// src/App.tsx - Simplified to app-level concerns only
export function App() {
  const { currentDataset, currentPlugin, pluginStates, setPluginState } = useAppStore();
  const plugin = currentPlugin ? PluginRegistry.getPlugin(currentPlugin) : null;
  
  // Data loading remains here (app-level concern)
  const { data, loading, error } = usePluginData(currentPlugin, currentDataset);
  
  return (
    <div className="app">
      <header>
        {/* App-level controls only */}
        <DatasetSelector />
        <PluginSelector />
        
        {/* Plugin renders its own controls */}
        {plugin?.renderControls && data && (
          <div className="plugin-controls">
            {plugin.renderControls({
              state: pluginStates[plugin.id] || plugin.getInitialState?.() || {},
              updateState: (updates) => setPluginState(plugin.id, updates),
              data,
            })}
          </div>
        )}
      </header>
      
      <main>
        {loading && <LoadingSpinner />}
        {error && <ErrorDisplay error={error} />}
        {plugin && data && (
          plugin.render({
            data,
            state: pluginStates[plugin.id] || plugin.getInitialState?.() || {},
          })
        )}
      </main>
    </div>
  );
}
```

```typescript
// src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts
export const TimelineHeatmapPlugin: Plugin = {
  id: 'timeline-heatmap',
  name: 'Timeline Heatmap',
  supportedDatasets: ['DATASETS_excalidraw'],
  
  getInitialState: () => ({
    metric: 'commits' as const,
    timeBin: 'day' as const,
    selectedAuthors: [] as string[],
    selectedExtensions: [] as string[],
  }),
  
  // Plugin owns its controls
  renderControls: ({ state, updateState, data }) => (
    <div className="flex gap-4">
      <MetricSelector
        value={state.metric}
        onChange={(metric) => updateState({ metric })}
        metrics={['commits', 'events', 'authors']}
      />
      <TimeBinSelector
        value={state.timeBin}
        onChange={(timeBin) => updateState({ timeBin })}
      />
      <FilterPanel
        authors={data.metadata.authors}
        extensions={data.metadata.extensions}
        selectedAuthors={state.selectedAuthors}
        selectedExtensions={state.selectedExtensions}
        onAuthorsChange={(authors) => updateState({ selectedAuthors: authors })}
        onExtensionsChange={(ext) => updateState({ selectedExtensions: ext })}
      />
    </div>
  ),
  
  render: ({ data, state }) => {
    // Use state.metric, state.timeBin, etc.
    // Existing heatmap rendering logic
  },
};
```

**What this unlocks**:
- **New visualizations require ZERO changes to App.tsx** - just register the plugin
- **Plugin-specific controls** are trivial - each plugin decides what it needs
- **No more conditional logic** - no "if heatmap show these filters, if treemap show those"
- **Controls can be complex** - a network graph plugin could render a sophisticated node filtering UI without touching shared code

**Migration path**:
1. **Phase 1** (2-3 hours): Add `renderControls` and `getInitialState` to plugin interface, update store with `pluginStates`
2. **Phase 2** (1 hour): Refactor TimelineHeatmapPlugin to use `renderControls`, move control rendering from App.tsx
3. **Phase 3** (30 mins): Clean up App.tsx, remove old filter/control state
4. **Phase 4** (ongoing): New plugins get controls "for free" - just implement `renderControls`

---

### 2. Extract Header Layout Control to Plugins

**Why this matters**: Right now the header layout is fixed (controls in one spot). Different visualizations might want different layouts - some might want a sidebar, some might want controls at the bottom, some might want split panels. Don't force every visualization into the same UI pattern.

**Current approach**: App.tsx controls header structure with fixed layout

**Suggested evolution**: Let plugins define their own layout patterns

```typescript
// src/types/plugin.ts
export interface Plugin {
  // ... existing fields ...
  
  // NEW: Plugin can specify layout preference
  layoutConfig?: {
    controlsPosition: 'header' | 'sidebar' | 'bottom' | 'custom';
    customLayout?: (props: PluginLayoutProps) => React.ReactNode;
  };
}

export interface PluginLayoutProps {
  controls: React.ReactNode;  // The plugin's rendered controls
  visualization: React.ReactNode;  // The plugin's rendered viz
}
```

```typescript
// src/App.tsx
export function App() {
  // ... data loading ...
  
  const layout = plugin?.layoutConfig?.controlsPosition || 'header';
  
  const controls = plugin?.renderControls?.({ state, updateState, data });
  const visualization = plugin?.render({ data, state });
  
  // Custom layout takes precedence
  if (plugin?.layoutConfig?.customLayout) {
    return plugin.layoutConfig.customLayout({ controls, visualization });
  }
  
  // Standard layouts
  return (
    <div className="app">
      {layout === 'header' && (
        <>
          <header>
            <AppControls />
            {controls}
          </header>
          <main>{visualization}</main>
        </>
      )}
      
      {layout === 'sidebar' && (
        <div className="flex">
          <aside className="w-64">
            <AppControls />
            {controls}
          </aside>
          <main className="flex-1">{visualization}</main>
        </div>
      )}
      
      {layout === 'bottom' && (
        <>
          <header><AppControls /></header>
          <main>{visualization}</main>
          <footer>{controls}</footer>
        </>
      )}
    </div>
  );
}
```

**What this unlocks**:
- **Network graph plugin** could use sidebar for node filtering
- **Comparison view** could use bottom controls with split panels above
- **Timeline heatmap** keeps current header layout (specify `controlsPosition: 'header'`)
- **Full custom layouts** for complex multi-panel visualizations

**Migration path**: 
- Optional change - add `layoutConfig` to interface but make it optional
- Timeline heatmap doesn't need to specify anything (defaults to 'header')
- New plugins can opt into different layouts as needed

---

## Architectural Decision: Your Key Question

> "Should controls be universal across all visualizations, or context-specific?"

**Answer: Hybrid approach, but lean heavily toward context-specific**

**Universal (App-level)**:
- ✅ Dataset selection - all visualizations need data
- ✅ Plugin selection - navigation between visualizations
- ✅ Global app settings (if you add theme, etc.)

**Context-Specific (Plugin-level)**:
- ✅ Metrics (commits/events/authors) - heatmap specific
- ✅ Time binning (day/week/month) - heatmap specific
- ✅ Author filters - heatmap specific
- ✅ File type filters - heatmap specific
- ✅ Everything else plugins will need

**Why this is right for your codebase**:
1. **Your visualizations will be different** - A treemap animation doesn't need time binning. A network graph doesn't need metric selection. Forcing universal controls creates UI clutter and maintenance burden.

2. **Your plugin architecture is already there** - You have the abstraction layer. Just give plugins more responsibility.

3. **You'll ship visualizations faster** - No more "figure out how this fits into App.tsx filter logic" friction.

4. **The heatmap proves the pattern** - It has 4 different control types. Those will NOT be universal across other visualizations. Don't pretend they will be.

---

## Optional Enhancements (Defer These)

### Control Panel Composition
If multiple plugins start sharing control components (e.g., everyone needs author filtering), you could create a `ControlPanelBuilder` utility:

```typescript
const controls = new ControlPanelBuilder()
  .addMetricSelector(['commits', 'events'])
  .addAuthorFilter(data.metadata.authors)
  .addCustom(<MySpecialControl />)
  .build();
```

**Don't do this yet** - wait until you have 3+ plugins sharing controls. Right now it's premature abstraction.

### Shareable Control State
If plugins need to share state (e.g., author filter selection across multiple views), add `sharedState` to store alongside `pluginStates`.

**Don't do this yet** - wait until you actually need it.

---

## What to Keep Doing

1. **Data layer separation** - `DataProcessor`, `PluginDataLoader`, `DatasetRegistry` are excellent. Don't touch these.

2. **Type safety** - Your TypeScript usage is strong. Maintain those domain types.

3. **Simple state management** - Zustand is perfect for this scale. Don't upgrade to Redux/MobX/etc.

4. **Static data approach** - No backend is a feature, not a limitation. Keep it simple.

---

## Visual Structure After Refactor

```
App.tsx (20-30 lines)
├─ Dataset Selector (universal)
├─ Plugin Selector (universal)
└─ Current Plugin Container
   ├─ Plugin.renderControls() → Plugin owns its UI
   └─ Plugin.render() → Plugin owns its viz

plugins/
├─ timeline-heatmap/
│  ├─ TimelineHeatmapPlugin.ts (defines controls + rendering)
│  └─ components/ (heatmap-specific components)
├─ treemap-animation/
│  ├─ TreemapPlugin.ts (defines its own controls)
│  └─ components/ (treemap-specific components)
└─ network-graph/  ← Adding this is now trivial
   ├─ NetworkPlugin.ts (defines its own controls)
   └─ components/ (network-specific components)
```

---

## Implementation Priority

**Do This First (Highest ROI)**:
1. ✅ Add `renderControls` to plugin interface (1 hour)
2. ✅ Add `pluginStates` to store (30 mins)
3. ✅ Refactor TimelineHeatmapPlugin to use new pattern (2 hours)
4. ✅ Simplify App.tsx to just app-level concerns (1 hour)

**Do This Second (High Value)**:
5. ✅ Add `layoutConfig` to plugin interface (30 mins)
6. ✅ Test with TreemapPlugin - verify it works for a different visualization (1 hour)

**Nice to Have (Wait Until Needed)**:
- Control composition utilities
- Shared state between plugins
- Advanced layout features

---

## Final Thought: You're at the Right Inflection Point

The transition you're making (single visualization → multi-visualization platform) is THE classic moment where architecture matters. You caught it early. Most projects realize this 5 plugins later when App.tsx is 1000 lines of spaghetti.

The refactor I'm suggesting isn't a rewrite - it's moving responsibility from App to plugins. You'll delete more code than you add. And when you finish, adding your 3rd, 4th, 5th visualization will take 1/10th the effort.

**Core principle**: Make the common case (adding a new visualization) ridiculously easy. Make App.tsx boring. Let plugins be interesting.