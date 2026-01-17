# Bug Report: Race Condition During Rapid Plugin Switching

**Issue ID:** `ARCH-001`  
**Severity:** High  
**Type:** Architecture / Race Condition  
**Component:** Plugin System, Data Processing  
**Date Reported:** 2026-01-17  
**Status:** Open - Investigation Required

---

## Summary

Rapid switching between Timeline Heatmap and Treemap Explorer plugins causes a race condition that results in `TypeError: Cannot read properties of undefined (reading 'type')` in the TimelineHeatmapPlugin's `traverse` function. This indicates a fundamental architectural gap in plugin lifecycle management.

---

## Reproduction Steps

1. Load the application with both plugins registered
2. Navigate to the Plugin Selector
3. Rapidly switch between "Timeline Heatmap" and "Treemap Explorer" multiple times (click back and forth quickly)
4. Error occurs within 3-5 rapid switches

**Reproducibility:** High (occurs consistently with rapid switching)

---

## Error Details

### Stack Trace
```
TypeError: Cannot read properties of undefined (reading 'type')
    at traverse (TimelineHeatmapPlugin.ts:281:16)
    at TimelineHeatmapPlugin.processData (TimelineHeatmapPlugin.ts:286:5)
    at App.tsx:219:38
    at commitHookEffectListMount
```

### Key Observations from Logs
- Data loader shows successful cache hits for all datasets
- Both plugins successfully register on initialization
- Error occurs during data processing phase, NOT data loading
- Multiple concurrent `processData` calls appear to be executing
- The `traverse` function receives `undefined` instead of a valid node object

---

## Root Cause Analysis

### Architectural Issues Identified

#### 1. **Missing Plugin Lifecycle Hooks**
The current architecture lacks proper lifecycle management:

**Current State:**
- ✅ `register()` - Plugin registration exists
- ✅ `loadData()` - Data loading exists
- ❌ `onMount()` - No mount hook
- ❌ `onUnmount()` - No unmount/cleanup hook
- ❌ `abort()` - No cancellation mechanism

**Impact:**
When switching plugins, the previous plugin's `processData` operation continues running against data structures that may be cleared, reset, or reallocated for the new plugin.

#### 2. **No Operation Cancellation Pattern**
The data processing pipeline lacks cancellation support:

```typescript
// Current flow (simplified):
useEffect(() => {
  processData(loadedData);  // No way to cancel if effect re-runs
}, [activePlugin, loadedData]);
```

**Problem:**
- No AbortController or cancellation token pattern
- `processData()` assumes it will always complete
- Rapid switches trigger multiple concurrent `processData()` calls
- No mechanism to abort in-flight operations

#### 3. **Shared Mutable State Without Coordination**

Components involved in plugin transitions:
- `App.tsx` - Triggers processing via useEffect
- `PluginRegistry` - Manages plugin metadata
- `PluginDataLoader` - Handles data caching/loading
- Individual plugins - Process and transform data

**Issue:**
No coordinator ensures these components are synchronized during plugin transitions. State transitions are implicit and unmanaged.

#### 4. **Data Structure Assumptions**

The `traverse` function expects nodes to have a `.type` property:
```typescript
traverse(node) {
  if (node.type === 'file') { ... }  // Line 281 - crashes if node is undefined
}
```

**Why `node` becomes undefined:**
1. Plugin A starts traversing file hierarchy tree
2. User switches to Plugin B
3. Data loader clears/resets cache or data structures
4. Plugin A's ongoing traversal hits undefined nodes
5. TypeError thrown

---

## Impact Assessment

### User Experience
- **Severity:** High - Application crashes, requires page reload
- **Frequency:** Medium-High - Occurs with power users who navigate quickly
- **Workaround:** Slow down switching, wait for rendering to complete

### Technical Debt
- **Propagation Risk:** High - Same pattern likely affects other plugin operations
- **Test Coverage Gap:** No integration tests for rapid state transitions
- **Architectural Debt:** Plugin system needs lifecycle redesign

### Business Impact
- Reduces trust in application stability
- Blocks adoption by users with fast workflows
- Limits ability to add more plugins (same issue will multiply)

---

## Investigation Checklist

### Immediate Analysis Needed

- [ ] **Inspect App.tsx:219** - Examine the exact useEffect that triggers processData
  - Does it have a cleanup function?
  - What are its dependencies?
  - Is it using stale closures?

- [ ] **Review TimelineHeatmapPlugin.ts:281-286** - Analyze traverse implementation
  - What data structure is being traversed?
  - Where does this structure come from?
  - Can nodes become undefined mid-traversal?

- [ ] **Audit PluginDataLoader cache behavior**
  - When does cache get cleared?
  - Can cache entries be modified while being read?
  - Is there a cache versioning mechanism?

- [ ] **Trace data flow during plugin switch**
  - Document exact sequence: click → state change → data operations → render
  - Identify all async operations that might overlap
  - Map which operations can run concurrently

### Broader Architectural Review

- [ ] **Survey all plugin `processData` methods**
  - Do other plugins have similar vulnerabilities?
  - Are there other traverse-like operations?

- [ ] **Review zustand store (appStore.ts)**
  - How is `activePlugin` state managed?
  - Are there intermediate states during transitions?
  - Is there a "switching" or "loading" state?

- [ ] **Analyze plugin data requirements**
  - Timeline Heatmap: file_lifecycle, author_network, file_index, directory_stats
  - Treemap Explorer: file_index, cochange_network, temporal_daily
  - Do they share data structures that get mutated?

---

## Proposed Solutions

### Option 1: Quick Fix (Band-Aid) ⚠️
**Add defensive guards and cleanup**

**Changes Required:**
1. Add null checks in `traverse()`:
   ```typescript
   traverse(node) {
     if (!node?.type) return; // Guard against undefined
     // ... rest of logic
   }
   ```

2. Add cleanup to App.tsx effect:
   ```typescript
   useEffect(() => {
     let cancelled = false;
     processData().then(result => {
       if (!cancelled) setVisualization(result);
     });
     return () => { cancelled = true; };
   }, [activePlugin]);
   ```

**Pros:**
- Quick to implement (30 minutes)
- Stops crashes immediately

**Cons:**
- Doesn't fix root cause
- Silent failures (operations just stop)
- Same pattern will cause bugs elsewhere
- Technical debt increases

**Recommendation:** ⚠️ **Only as temporary hotfix**

---

### Option 2: Add AbortController Pattern (Moderate) ✅
**Implement cancellation for async operations**

**Changes Required:**
1. Extend plugin interface with abort support:
   ```typescript
   interface Plugin {
     processData(data: unknown, signal?: AbortSignal): Promise<VisualizationData>;
   }
   ```

2. Use AbortController in App.tsx:
   ```typescript
   useEffect(() => {
     const controller = new AbortController();
     processData(data, controller.signal);
     return () => controller.abort();
   }, [activePlugin]);
   ```

3. Update plugins to check abort signal:
   ```typescript
   async processData(data, signal) {
     for (let node of nodes) {
       if (signal?.aborted) throw new DOMException('Aborted');
       // process node
     }
   }
   ```

**Pros:**
- Standard pattern (Web API)
- Graceful cancellation
- Prevents wasted computation
- Moderate implementation effort

**Cons:**
- Requires updating all plugins
- Doesn't address lifecycle management
- Still reactive rather than proactive

**Recommendation:** ✅ **Good intermediate solution**

---

### Option 3: Plugin Lifecycle Controller (Robust) 🎯
**Add proper lifecycle management to plugin system**

**Changes Required:**
1. Define lifecycle interface:
   ```typescript
   interface PluginLifecycle {
     onMount(container: HTMLElement, data: DataSet): Promise<void>;
     onUnmount(): Promise<void>;
     onDataUpdate(data: DataSet): Promise<void>;
     onAbort(): void;
   }
   ```

2. Create PluginLifecycleManager:
   ```typescript
   class PluginLifecycleManager {
     async switchPlugin(from: Plugin, to: Plugin) {
       await from.onUnmount();  // Clean up old
       await to.onMount();      // Initialize new
     }
   }
   ```

3. Add state machine for transitions:
   ```typescript
   enum PluginState {
     IDLE,
     MOUNTING,
     MOUNTED,
     UNMOUNTING,
     ERROR
   }
   ```

4. Prevent operations during transitions:
   ```typescript
   if (state === PluginState.MOUNTING || state === PluginState.UNMOUNTING) {
     return; // Ignore new operations
   }
   ```

**Pros:**
- Solves root cause
- Prevents entire class of race conditions
- Clear state management
- Supports future plugin features (pause/resume, etc.)
- Testable lifecycle transitions

**Cons:**
- Significant refactoring (2-3 days)
- Breaking changes to plugin API
- Requires updating both existing plugins

**Recommendation:** 🎯 **Best long-term solution**

---

### Option 4: Queue-Based Processing (Alternative) 🔄
**Serialize plugin operations through a queue**

**Changes Required:**
1. Create PluginOperationQueue:
   ```typescript
   class PluginOperationQueue {
     private queue: Operation[] = [];
     private processing = false;
     
     async enqueue(op: Operation) {
       queue.push(op);
       if (!processing) this.process();
     }
     
     private async process() {
       while (queue.length > 0) {
         await queue.shift().execute();
       }
     }
   }
   ```

2. Queue all plugin switches:
   ```typescript
   onPluginSwitch(newPlugin) {
     queue.enqueue({
       execute: () => this.switchPlugin(newPlugin)
     });
   }
   ```

**Pros:**
- Guarantees serial execution
- No concurrent operations
- Easy to add operation logging/debugging

**Cons:**
- Can feel sluggish if operations are slow
- Doesn't address lifecycle hooks
- Queue management adds complexity

**Recommendation:** 🔄 **Consider for high-latency operations**

---

## Recommended Approach

### Phase 1: Immediate (This Week)
Implement **Option 1 (Quick Fix)** to stop crashes:
- Add null guards to `traverse()`
- Add basic cleanup to App.tsx effect
- Deploy to production

### Phase 2: Short-Term (Next Sprint)
Implement **Option 2 (AbortController)**:
- Add signal parameter to plugin interface
- Update both plugins to respect abort signal
- Add integration tests for rapid switching

### Phase 3: Long-Term (Q1 2026)
Implement **Option 3 (Lifecycle Controller)**:
- Design comprehensive lifecycle hooks
- Create PluginLifecycleManager
- Refactor existing plugins to use lifecycle
- Add state machine for transitions
- Comprehensive test coverage

---

## Testing Strategy

### Regression Tests Needed
1. **Rapid Plugin Switching Test**
   ```typescript
   test('handles rapid plugin switching without errors', async () => {
     for (let i = 0; i < 20; i++) {
       await switchPlugin('timeline-heatmap');
       await switchPlugin('treemap-explorer');
     }
     expect(errors).toHaveLength(0);
   });
   ```

2. **Concurrent Operation Test**
   ```typescript
   test('aborts in-flight processing on plugin switch', async () => {
     const promise1 = processPluginA(largeDataset);
     switchToPluginB(); // Should abort promise1
     await expect(promise1).rejects.toThrow('Aborted');
   });
   ```

3. **Stress Test**
   - Switch plugins every 100ms for 60 seconds
   - Monitor memory leaks
   - Verify no stale operations

### Integration Tests
- Test with real dataset sizes
- Test with slow network (simulated)
- Test with different plugin load orders

---

## Related Issues

- Investigate if same pattern affects other async operations
- Review all useEffect hooks for missing cleanup
- Audit data loader cache eviction strategy

---

## References

- `TimelineHeatmapPlugin.ts:281` - Where error occurs
- `App.tsx:219` - Where processing is triggered
- `PluginDataLoader.ts` - Cache management
- `appStore.ts` - State management

---

## Next Steps

1. **Assign investigation owner** - Who will do deep dive into App.tsx and plugin lifecycle?
2. **Reproduce in test environment** - Create automated reproduction test
3. **Choose solution path** - Team decision on Option 1, 2, 3, or 4
4. **Spike for Option 3** - If chosen, 1-day spike to validate feasibility
5. **Create implementation tasks** - Break down chosen solution into trackable work

---

## Discussion Questions

1. Are there other locations in the codebase with similar patterns?
2. Should we add a "loading/switching" UI state to prevent user actions during transitions?
3. What's our tolerance for breaking changes to the plugin API?
4. Do we need plugin versioning if we introduce lifecycle hooks?
5. Should data loading also be part of the lifecycle, or remain separate?

---

**Reporter:** Development Team  
**Priority:** P1 (Crashes in production)  
**Target Resolution:** Phase 1 by end of week, Phase 2 within 2 weeks