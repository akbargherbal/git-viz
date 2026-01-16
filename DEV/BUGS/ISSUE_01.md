1 - CellDetailPanel seems not snappy when one switch between context; like switching between Events and Author; once a cell is clicked, directory name has some latency in displaying; everything else display instantly.

The following part seems to have latency in some cases; like it's calculating things!
```
<div class="p-4 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-start sticky top-0 z-10 backdrop-blur-md"><div class="overflow-hidden"><div class="flex items-center gap-2 text-blue-400 mb-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-git-commit"><circle cx="12" cy="12" r="3"></circle><line x1="3" x2="9" y1="12" y2="12"></line><line x1="15" x2="21" y1="12" y2="12"></line></svg><span class="text-[10px] font-bold uppercase tracking-wider">Commit Activity</span></div><h3 class="text-sm font-bold text-white break-all leading-tight font-mono" title="packages/excalidraw/tests/__snapshots__">__snapshots__</h3><div class="text-xs text-zinc-500 truncate">packages/excalidraw/tests/__snapshots__</div></div><button class="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button></div>
```


```
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-start sticky top-0 z-10 backdrop-blur-md">
        <div className="overflow-hidden">
          <div className={`flex items-center gap-2 ${headerConfig.color} mb-1`}>
            <HeaderIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {headerConfig.label}
            </span>
          </div>
          <h3
            className="text-sm font-bold text-white break-all leading-tight font-mono"
            title={cell.directory}
          >
            {cell.directory.split("/").pop()}
          </h3>
          <div className="text-xs text-zinc-500 truncate">{cell.directory}</div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>
```


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