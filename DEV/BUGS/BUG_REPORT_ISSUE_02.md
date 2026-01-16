# Bug Report: Plugin Switching Crash (Issue #02)

**Status:** 🔴 CRITICAL - Application Crash  
**Priority:** P1 - Blocks core functionality  
**Component:** Plugin Lifecycle Management  
**Reported:** 2026-01-16  
**Affects:** v2.0.0

---

## 📋 Summary

Switching from Timeline Heatmap → Treemap Structure → Timeline Heatmap causes application crash with error: `Cannot read properties of undefined (reading 'children')`. The error originates from TreemapPlugin attempting to process data when Timeline Heatmap should be active.

---

## 🐛 Bug Details

### Error Message
```
TypeError: Cannot read properties of undefined (reading 'children')
    at objectChildren (d3.js?v=97e21041:10892:12)
    at Module.hierarchy (d3.js?v=97e21041:10877:19)
    at TreemapPlugin.processData (TreemapPlugin.ts:41:8)
    at App.tsx:224:38
```

### Reproduction Steps

1. Launch application with Timeline Heatmap as default plugin
2. Click "Treemap Structure" in plugin selector
3. Wait for Treemap to render successfully
4. Click "Timeline Heatmap" to switch back
5. **Result:** Application crashes with error overlay

**Reproduction Rate:** 100% (consistent)

**Environment:**
- Browser: Any (Chrome/Firefox/Safari)
- Mode: Development & Production builds
- Dataset: Any (tested with excalidraw dataset)

---

## 🔍 Root Cause Analysis

### Primary Issue: Plugin Re-registration

Console logs show duplicate plugin registrations on every switch:

```
PluginRegistry.ts:25 Registered plugin: Timeline Heatmap (timeline-heatmap)
PluginRegistry.ts:25 Registered plugin: Treemap Structure (treemap-animation)
PluginRegistry.ts:25 Registered plugin: Timeline Heatmap (timeline-heatmap)  // ❌ DUPLICATE
PluginRegistry.ts:25 Registered plugin: Treemap Structure (treemap-animation) // ❌ DUPLICATE
```

**Analysis:** Plugins are being re-registered on component re-render instead of once at initialization.

### Secondary Issue: Wrong Plugin Invoked

The crash occurs in `TreemapPlugin.processData()` even though user switched TO Timeline Heatmap:

```javascript
// TreemapPlugin.ts:41
processData(dataset: OptimizedDataset) {
  const root = d3
    .hierarchy(dataset.tree)  // ❌ dataset.tree is undefined
    .sum((d) => (d.type === "file" ? 1 : 0))
```

**Why this happens:**
1. User switches to Timeline Heatmap
2. Data loads successfully (cache hit)
3. App.tsx calls `processData()` on wrong plugin instance (TreemapPlugin instead of TimelineHeatmapPlugin)
4. TreemapPlugin expects `dataset.tree` property
5. Timeline Heatmap data doesn't have `tree` property → `undefined`
6. D3's `hierarchy()` tries to access `undefined.children` → crash

### Tertiary Issue: Lifecycle Not Managed

No evidence of `destroy()` being called when switching away from plugins:

```
// Expected but missing:
✗ Destroying plugin: Timeline Heatmap
✗ Destroying plugin: Treemap Structure
```

**Impact:** Previous plugin state, DOM elements, and references persist across switches.

---

## 🏗️ Affected Code Locations

### 1. App.tsx (Primary)

**Location:** `App.tsx:224` (data processing/rendering effect)

**Suspected Issues:**
- Plugin registration inside React component lifecycle
- Missing cleanup on plugin switch
- Wrong plugin reference used for `processData()`
- Missing guards for data structure validation

### 2. PluginRegistry.ts

**Current Behavior:**
```typescript
// Allows duplicate registrations - last one wins
register(plugin: VisualizationPlugin) {
  this.plugins.set(plugin.metadata.id, plugin);
  // No check for existing registration
  // No warning/error on duplicate
}
```

**Issues:**
- No duplicate detection
- No `clear()` or `unregister()` methods
- No registry reset between plugin switches

### 3. TreemapPlugin.ts:41

**Current Code:**
```typescript
processData(dataset: OptimizedDataset) {
  const root = d3
    .hierarchy(dataset.tree)  // ❌ No null check
    .sum((d) => (d.type === "file" ? 1 : 0))
    .sort((a, b) => (b.value || 0) - (a.value || 0));
  return root;
}
```

**Issues:**
- No validation that `dataset.tree` exists
- Assumes correct data structure
- No defensive error handling

### 4. PluginDataLoader.ts

**Cache Behavior:**
```
PluginDataLoader.ts:107 Cache hit for: file_lifecycle
PluginDataLoader.ts:107 Cache hit for: author_network
PluginDataLoader.ts:107 Cache hit for: file_index
PluginDataLoader.ts:107 Cache hit for: directory_stats
```

**Suspected Issues:**
- Cache not keyed by plugin ID
- Timeline Heatmap data served to TreemapPlugin
- No cache invalidation on plugin switch

---

## 💥 Impact Assessment

### User Impact
- **Severity:** CRITICAL - App becomes unusable
- **Frequency:** Every time user switches Timeline → Treemap → Timeline
- **Workaround:** Full page reload required
- **Data Loss:** Current filters, zoom level, cell selections lost

### Developer Impact
- Blocks testing of plugin switching functionality
- Undermines plugin architecture benefits
- May hide other lifecycle bugs

### Business Impact
- Poor first impression for new users
- Demos crash during plugin showcase
- Documentation can't showcase multi-plugin workflows

---

## ✅ Acceptance Criteria for Fix

### Must Have
1. ✅ User can switch between plugins unlimited times without crashes
2. ✅ Correct plugin processes correct data structure
3. ✅ No duplicate plugin registrations in console
4. ✅ Previous plugin properly cleaned up on switch

### Should Have
5. ✅ Plugin state (zoom, filters) persists across switches
6. ✅ Smooth transition (<100ms) between plugins
7. ✅ Clear error message if data structure invalid

### Nice to Have
8. ✅ Memory usage stable after 100+ plugin switches
9. ✅ Works with Hot Module Replacement (HMR) in dev
10. ✅ Integration tests for plugin switching

---

## 🔧 Proposed Fix Strategy

### Phase 1: Defensive Guards (Low Risk)
**Timeline:** 1 hour  
**PR Size:** Small (~50 lines)

```typescript
// TreemapPlugin.ts
processData(dataset: OptimizedDataset) {
  if (!dataset.tree) {
    throw new Error(
      'TreemapPlugin requires dataset.tree property. ' +
      'Ensure directory_stats dataset is loaded and processed correctly.'
    );
  }
  // ... existing code
}
```

**Benefits:**
- Prevents undefined errors
- Clear error messages
- No architectural changes
- Safe to deploy immediately

### Phase 2: Registration Fix (Medium Risk)
**Timeline:** 2-3 hours  
**PR Size:** Medium (~150 lines)

**Changes:**
1. Move plugin registration outside React component
2. Add `PluginRegistry.clear()` method
3. Prevent duplicate registrations
4. Add HMR compatibility

```typescript
// main.tsx or plugin-bootstrap.ts
import { PluginRegistry } from '@/plugins/core/PluginRegistry';
import { TimelineHeatmapPlugin } from '@/plugins/timeline-heatmap';
import { TreemapPlugin } from '@/plugins/treemap-animation';

// Register once at app initialization
PluginRegistry.register(new TimelineHeatmapPlugin());
PluginRegistry.register(new TreemapPlugin());

// HMR handling
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    PluginRegistry.clear();
    // Re-register plugins
  });
}
```

### Phase 3: Lifecycle Management (High Risk)
**Timeline:** 4-6 hours  
**PR Size:** Large (~300 lines)

**Changes:**
1. Add proper `destroy()` calls in App.tsx
2. Implement cache keying by plugin ID
3. Add state cleanup on plugin switch
4. Separate visualization state from user preferences

```typescript
// App.tsx - Plugin switch handler
const handlePluginSwitch = (newPluginId: string) => {
  // 1. Destroy old plugin
  if (currentPlugin) {
    currentPlugin.destroy();
    console.log(`Destroyed plugin: ${currentPlugin.metadata.name}`);
  }
  
  // 2. Clear plugin-specific cache
  PluginDataLoader.clearCache(currentPluginId);
  
  // 3. Clear plugin state (but preserve user preferences)
  store.clearPluginVisualizationState(currentPluginId);
  
  // 4. Load new plugin
  setCurrentPluginId(newPluginId);
};
```

### Phase 4: Integration Tests
**Timeline:** 2-3 hours  
**PR Size:** Medium (~200 lines)

```typescript
describe('Plugin Switching', () => {
  it('should handle Timeline → Treemap → Timeline without crash', () => {
    render(<App />);
    
    // Start with Timeline
    expect(screen.getByText('Timeline Heatmap')).toBeInTheDocument();
    
    // Switch to Treemap
    fireEvent.click(screen.getByText('Treemap Structure'));
    await waitFor(() => {
      expect(screen.getByTestId('treemap-container')).toBeInTheDocument();
    });
    
    // Switch back to Timeline - should not crash
    fireEvent.click(screen.getByText('Timeline Heatmap'));
    await waitFor(() => {
      expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
    });
    
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
  
  it('should call destroy() when switching away from plugin', () => {
    const mockPlugin = createMockPlugin();
    const destroySpy = vi.spyOn(mockPlugin, 'destroy');
    
    // ... test implementation
    
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});
```

---

## 🧪 Test Scenarios

### Critical Tests
1. **Rapid Switching:** Switch plugins 20 times in quick succession
2. **Data Integrity:** Verify correct data loaded for each plugin after switch
3. **Memory Leaks:** Monitor memory usage during 100+ switches
4. **State Persistence:** User filters should persist across switches (if applicable)
5. **Error Recovery:** App should recover gracefully if plugin crashes

### Edge Cases
- Switch during data loading
- Switch before first plugin fully initialized
- Multiple rapid switches before first completes
- Switch with no dataset selected
- Switch with corrupted dataset

### Browser Compatibility
- Chrome (v120+)
- Firefox (v120+)
- Safari (v17+)
- Edge (v120+)

---

## 📊 Metrics to Monitor Post-Fix

### Error Tracking
- Plugin switch error rate (target: 0%)
- Time to recover from error (target: N/A - no errors)

### Performance
- Average plugin switch time (target: <100ms)
- Memory usage after 50 switches (target: <50MB increase)
- Cache hit rate (target: >80%)

### User Experience
- Plugin switch success rate (target: 100%)
- User complaints about crashes (target: 0)

---

## 🔗 Related Issues

- **Issue #01:** CellDetailPanel latency (separate, lower priority)
- **Future:** Plugin state persistence across sessions
- **Future:** Plugin loading indicators during switch

---

## 📝 Additional Notes

### Why This Wasn't Caught Earlier
1. No integration tests for plugin switching
2. Manual testing focused on individual plugin features
3. Registry re-registration masked underlying issues
4. Cache behavior not documented

### Prevention Strategy
1. Add plugin switching to smoke test suite
2. Implement E2E tests with Playwright
3. Add error boundaries around plugin containers
4. Document plugin lifecycle contract

---

## 👥 Stakeholders

**Engineering:**
- Frontend Team: Fix implementation
- QA Team: Test coverage

**Product:**
- PM: Prioritization decision
- UX: Transition animations (Phase 3+)

**Timeline Estimate:**
- Phase 1 (Guards): 1 hour
- Phase 2 (Registration): 3 hours  
- Phase 3 (Lifecycle): 6 hours
- Phase 4 (Tests): 3 hours
- **Total:** ~13 hours (~2 dev days)

---

## 📎 Attachments

- Console logs: See ISSUE_01.md
- Video recording: [To be captured during reproduction]
- Related codebase: CODEBASE.txt (lines 5820-5968 for TreemapPlugin)

---

**Report Author:** Development Team  
**Last Updated:** 2026-01-16  
**Next Review:** After Phase 1 implementation
