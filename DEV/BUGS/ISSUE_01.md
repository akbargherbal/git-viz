1 - CellDetailPanel seems not snappy when one switch between context; like switching between Events and Author; once a cell is clicked, directory name has some latency in displaying; everything else display instantly.
2 - Switching from Timeline Heatmap --> Treemap Structure --> back to Timeline Heatmap produces the following error:

```
Error

Cannot read properties of undefined (reading 'children')

Please check the console for more details or try reloading the page.
```

```
PluginRegistry.ts:25 Registered plugin: Timeline Heatmap (timeline-heatmap)
PluginRegistry.ts:32   - Data Requirements: file_lifecycle (required), author_network (required), file_index (required), directory_stats (required)
PluginRegistry.ts:25 Registered plugin: Treemap Structure (treemap-animation)
PluginRegistry.ts:25 Registered plugin: Timeline Heatmap (timeline-heatmap)
PluginRegistry.ts:32   - Data Requirements: file_lifecycle (required), author_network (required), file_index (required), directory_stats (required)
PluginRegistry.ts:25 Registered plugin: Treemap Structure (treemap-animation)
PluginDataLoader.ts:120 [PluginDataLoader] Loading dataset: file_lifecycle
PluginDataLoader.ts:120 [PluginDataLoader] Loading dataset: author_network
PluginDataLoader.ts:120 [PluginDataLoader] Loading dataset: file_index
PluginDataLoader.ts:120 [PluginDataLoader] Loading dataset: directory_stats
PluginDataLoader.ts:107 [PluginDataLoader] Cache hit for: file_lifecycle
PluginDataLoader.ts:107 [PluginDataLoader] Cache hit for: author_network
PluginDataLoader.ts:107 [PluginDataLoader] Cache hit for: file_index
PluginDataLoader.ts:107 [PluginDataLoader] Cache hit for: directory_stats
installHook.js:1 Error processing/rendering: TypeError: Cannot read properties of undefined (reading 'children')
    at objectChildren (d3.js?v=97e21041:10892:12)
    at Module.hierarchy (d3.js?v=97e21041:10877:19)
    at TreemapPlugin.processData (TreemapPlugin.ts:41:8)
    at App.tsx:224:38
    at commitHookEffectListMount (chunk-A4PLE5AR.js?v=97e21041:16915:34)
    at commitPassiveMountOnFiber (chunk-A4PLE5AR.js?v=97e21041:18156:19)
    at commitPassiveMountEffects_complete (chunk-A4PLE5AR.js?v=97e21041:18129:17)
    at commitPassiveMountEffects_begin (chunk-A4PLE5AR.js?v=97e21041:18119:15)
    at commitPassiveMountEffects (chunk-A4PLE5AR.js?v=97e21041:18109:11)
    at flushPassiveEffectsImpl (chunk-A4PLE5AR.js?v=97e21041:19490:11) Error Component Stack
    at App (App.tsx:25:24)
overrideMethod @ installHook.js:1
(anonymous) @ App.tsx:231
commitHookEffectListMount @ chunk-A4PLE5AR.js?v=97e21041:16915
commitPassiveMountOnFiber @ chunk-A4PLE5AR.js?v=97e21041:18156
commitPassiveMountEffects_complete @ chunk-A4PLE5AR.js?v=97e21041:18129
commitPassiveMountEffects_begin @ chunk-A4PLE5AR.js?v=97e21041:18119
commitPassiveMountEffects @ chunk-A4PLE5AR.js?v=97e21041:18109
flushPassiveEffectsImpl @ chunk-A4PLE5AR.js?v=97e21041:19490
flushPassiveEffects @ chunk-A4PLE5AR.js?v=97e21041:19447
commitRootImpl @ chunk-A4PLE5AR.js?v=97e21041:19416
commitRoot @ chunk-A4PLE5AR.js?v=97e21041:19277
performSyncWorkOnRoot @ chunk-A4PLE5AR.js?v=97e21041:18895
flushSyncCallbacks @ chunk-A4PLE5AR.js?v=97e21041:9119
(anonymous) @ chunk-A4PLE5AR.js?v=97e21041:18627


```