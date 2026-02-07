# React Application Structure Analysis

Generated: 2026-02-07T20:42:51.603Z

## Components

### src/components/common/ErrorDisplay.tsx
- **ErrorDisplay** (function)
- **default** (function)

### src/components/common/LoadingSpinner.tsx
- **LoadingSpinner** (function)
- **default** (function)

### src/components/common/ScrollIndicatorOverlay.tsx
- **ScrollIndicatorOverlay** (function)
- **default** (function)

### src/components/common/TimeBinSelector.tsx
- **TimeBinSelector** (function)
- **default** (function)

### src/components/layout/PluginSelector.tsx
- **PluginSelector** (function)
- **default** (function)

### src/plugins/timeline-heatmap/components/CellDetailPanel.tsx
- **CellDetailPanel** (function)
- **default** (function)

### src/plugins/timeline-heatmap/components/TimelineHeatmapFilters.tsx
- **TimelineHeatmapFilters** (function)

### src/plugins/treemap-explorer/components/CouplingView.tsx
- **CouplingView** (function)

### src/plugins/treemap-explorer/components/DebtView.tsx
- **DebtView** (function)

### src/plugins/treemap-explorer/components/LensModeSelector.tsx
- **LensModeSelector** (function)

### src/plugins/treemap-explorer/components/TimelineScrubber.tsx
- **TimelineScrubber** (function)
- **default** (function)

### src/plugins/treemap-explorer/components/TimeView.tsx
- **TimeView** (function)

### src/plugins/treemap-explorer/components/TreemapDetailPanel.tsx
- **default** (function)

### src/plugins/treemap-explorer/components/TreemapExplorerControls.tsx
- **TreemapExplorerControls** (function)

### src/plugins/treemap-explorer/components/TreemapExplorerFilters.tsx
- **TreemapExplorerFilters** (function)

## Plugins

### src/plugins/init.ts
Exports: timelinePlugin, treemapExplorerPlugin

### src/plugins/core/PluginRegistry.ts
Exports: PluginRegistry

### src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts
Exports: TimelineHeatmapState, HeatmapCell, TimelineHeatmapPlugin

### src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx
Exports: TreemapExplorerPlugin

### src/plugins/treemap-explorer/types.ts
Exports: FileData, EnrichedFileData, TemporalFileData, TemporalDailyData, TreemapHierarchyDatum, TreemapExplorerState

### src/plugins/treemap-explorer/renderers/BaseTreemapRenderer.ts
Exports: BaseTreemapRenderer

### src/plugins/treemap-explorer/renderers/CouplingArcRenderer.ts
Exports: CouplingArcRenderer

### src/plugins/treemap-explorer/renderers/CouplingRenderer.ts
Exports: CouplingRenderer

### src/plugins/treemap-explorer/renderers/DebtRenderer.ts
Exports: DebtRenderer

### src/plugins/treemap-explorer/renderers/TimeRenderer.ts
Exports: TimeRenderer

### src/plugins/treemap-explorer/utils/colorScales.ts
Exports: getDebtColor, getCouplingColor, getTimeColor, getCellColor

## Services

### src/services/data/CouplingDataProcessor.ts
Exports: CouplingEdge, CouplingPartner, FileCouplingData, CouplingNetworkData, CouplingIndex, CouplingDataProcessor

### src/services/data/DataFormatAdapter.ts
Exports: DataFormat, AdaptedDataset, DataFormatAdapter

### src/services/data/DataProcessor.ts
Exports: RawLifecycleData, RawFileEvent, V2AuthorNetwork, V2FileIndex, V2DirectoryStats, DataProcessor

### src/services/data/DatasetRegistry.ts
Exports: DatasetDefinition, DatasetRegistryClass, DatasetRegistry

### src/services/data/HealthScoreCalculator.ts
Exports: HealthScoreInputs, HealthScoreResult, HealthScoreCalculator

### src/services/data/index.ts
Exports: DatasetRegistry, DatasetRegistryClass, DatasetDefinition, PluginDataLoader, PluginDataLoaderClass, PluginDataRequirement, PluginDataLoadResult, LoadProgress

### src/services/data/PluginDataLoader.ts
Exports: PluginDataRequirement, PluginDataLoadResult, PluginDataLoaderClass, PluginDataLoader

### src/services/data/TemporalDataProcessor.ts
Exports: DateRangeConfidence, DateRangeResult, TemporalDataProcessor, EnrichedFileData, TemporalFileData, TemporalDailyData

### src/services/data/types.ts
Exports: LoadProgress

## Hooks

### src/hooks/useScrollIndicators.tsx
- **useScrollIndicators**
  - Returns: `(ref: React.RefObject<HTMLElement>, options?: UseScrollIndicatorsOptions) => { scroll: (direction: "...`

