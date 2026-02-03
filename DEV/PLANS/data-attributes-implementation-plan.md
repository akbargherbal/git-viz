# Data Attributes Implementation Plan (REVISED)
## Strategic Enhancement for Testing & Debugging

**Project:** Git Repository Visualization Tool  
**Objective:** Add strategic data attributes for future test resilience and production debugging  
**Constraint:** Zero regression - all existing tests must continue passing unchanged  
**Approach:** Additive enrichment only, no test rewrites  
**Status:** FINAL PLAN - Ready for phased implementation

---

## Executive Summary

This plan adds data attributes to **9 components across 5 phases**. Each phase is independently valuable, takes 15-90 minutes, and requires zero test modifications.

**Total Estimated Time:** 4-5 hours across multiple sessions  
**Risk Level:** Minimal (attributes don't affect rendering or existing tests)  
**Phases:** App.tsx → FilterPanel → Navigation & Controls → TreemapExplorerControls → Detail Panels

---

## Complete Architecture Analysis

### State Ownership

```
┌─────────────────────────────────────────────────┐
│ Zustand Store (appStore.ts)                     │
├─────────────────────────────────────────────────┤
│ data: { loading, error, metadata, tree, ... }   │
│ filters: { authors, fileTypes, timeBin, ... }   │
│ ui: { activePluginId, showFilters, ... }        │
│ pluginStates: { [pluginId]: {...} }             │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ App.tsx (Orchestrator)                          │
├─────────────────────────────────────────────────┤
│ • Plugin lifecycle (load → process → render)    │
│ • Panel visibility (mutual exclusivity logic)   │
│ • Error/loading states                          │
│ • AbortController for cancellable operations    │
└─────────────────────────────────────────────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
┌──────────┐  ┌─────────────┐
│ Controls │  │ Panels      │
├──────────┤  ├─────────────┤
│ Plugin   │  │ Filter      │
│ Selector │  │ Panel       │
│          │  │             │
│ Lens     │  │ Detail      │
│ Mode     │  │ Panel       │
│          │  │             │
│ Metric   │  └─────────────┘
│ Selector │
│          │
│ TimeBin  │
│ Selector │
└──────────┘
```

### Critical Hidden Logic

**1. Mutual Exclusivity:**
```typescript
// When detail panel opens → filters auto-close
setSelectedCell: (cell) => ({
  selectedCell: cell,
  showFilters: cell ? false : state.ui.showFilters
})

// When filters open → detail panel auto-closes  
setShowFilters: (show) => ({
  showFilters: show,
  selectedCell: show ? null : state.ui.selectedCell
})
```

**2. Loading Pipeline:**
```
Phase 1: Load raw data (PluginDataLoader) → loadingProgress.phase
Phase 2: Process data (plugin.processData) → AbortController active
Phase 3: Render viz (plugin.init + render) → Complete
```

**3. Filter Count Calculation:**
```typescript
const hasActiveFilters = useMemo(() => {
  const globalActive = filters.authors.size > 0 || 
                       filters.fileTypes.size > 0 || ...;
  const pluginActive = activePlugin?.checkActiveFilters(state);
  return globalActive || pluginActive;
}, [filters, activePlugin, state]);
```

---

## Component Audit Results

### Full Component Inventory

| Component | Location | State Complexity | Debug Value | Test Brittleness | Priority |
|-----------|----------|------------------|-------------|------------------|----------|
| **App.tsx** | Root | **CRITICAL** | **CRITICAL** | Medium | **0** |
| **FilterPanel** | common/ | Very High | Very High | HIGH | **1** |
| **PluginSelector** | layout/ | Medium | High | Low | **2** |
| **LensModeSelector** | treemap/ | Low | High | Low | **2** |
| **MetricSelector** | common/ | Low | Medium | Low | **2** |
| **TimeBinSelector** | common/ | Low | Medium | Low | **2** |
| **TreemapExplorerControls** | treemap/ | Medium | Medium | Low | **3** |
| **TreemapDetailPanel** | treemap/ | Low-Medium | Medium | Low | **4** |
| **CellDetailPanel** | timeline/ | Low | Low | Low | **4** |

### Components Excluded (Too Simple / Low Value)

- **ErrorDisplay** - Static display, no complex state
- **LoadingSpinner** - Static display, no complex state  
- **ScrollIndicatorOverlay** - Visual only, no business logic

### Current Test Patterns

**Existing patterns:**
```typescript
data-testid="plugin-selector"
data-testid="filter-panel"
data-testid="filters-toggle"
data-testid="reset-filters"
data-testid="author-search"
data-testid={`viz-${plugin.id}`}
data-testid={`lens-${lens.id}`}
```

**Patterns to avoid in new tests:**
```typescript
screen.getByTitle("Filters")
screen.getByText("Alice")
screen.getByText(/Show All 6 Authors/)
```

---

## Phase 0: App.tsx Foundation
**Target:** Root orchestrator - debugging entry point  
**Estimated Time:** 60-90 minutes  
**Risk:** Minimal  
**Value:** Maximum

### Critical State to Expose

**1. Application Container** (root div):
```tsx
// Current (no attributes)
<div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">

// Enhanced
<div 
  className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden"
  data-testid="app-container"
  data-loading={data.loading}
  data-loading-phase={loadingProgress.phase}
  data-has-error={!!data.error}
  data-active-plugin={ui.activePluginId || "none"}
  data-plugin-data-ready={!!processedPluginData}
>
```

**2. Header Container** (plugin selector + controls):
```tsx
// Current
<header
  ref={headerContainerRef}
  className="bg-zinc-900 border-b border-zinc-800..."
>

// Enhanced  
<header
  ref={headerContainerRef}
  data-testid="app-header"
  data-active-plugin={ui.activePluginId || "none"}
  data-uses-plugin-controls={usesPluginControls}
  className="bg-zinc-900 border-b border-zinc-800..."
>
```

**3. Filter Toggle Button** (critical for panel debugging):
```tsx
// Current (has testid but no state)
<button
  onClick={() => setShowFilters(!ui.showFilters)}
  data-testid="filters-toggle"
  className={...}
  title={hasActiveFilters ? "Filters Active" : "Filters"}
>

// Enhanced
<button
  onClick={() => setShowFilters(!ui.showFilters)}
  data-testid="filters-toggle"
  data-active={ui.showFilters}
  data-has-active-filters={hasActiveFilters}
  data-filter-count={filters.authors.size + filters.fileTypes.size}
  data-disabled={false}
  className={...}
  title={hasActiveFilters ? "Filters Active" : "Filters"}
>
```

**4. Main Visualization Container**:
```tsx
// Current
<main
  ref={mainContainerRef}
  className="flex-1 flex flex-col overflow-hidden relative"
>

// Enhanced
<main
  ref={mainContainerRef}
  data-testid="visualization-container"
  data-active-plugin={ui.activePluginId || "none"}
  data-rendering={!!processedPluginData && !!activePlugin}
  className="flex-1 flex flex-col overflow-hidden relative"
>
```

**5. Filter Panel Container** (expose visibility + ownership):
```tsx
// Current
<aside
  className={`w-80 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-none panel-transition ${
    !ui.showFilters ? "panel-hidden" : ""
  }`}
>

// Enhanced
<aside
  data-testid="filter-panel-container"
  data-visible={ui.showFilters}
  data-plugin-owned={!!activePlugin?.renderFilters}
  data-active-plugin={ui.activePluginId || "none"}
  className={`w-80 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-none panel-transition ${
    !ui.showFilters ? "panel-hidden" : ""
  }`}
>
```

**6. Detail Panel Container** (expose visibility + mutual exclusivity):
```tsx
// Current
<aside
  className={`bg-zinc-900 border-l border-zinc-800 flex-none panel-transition relative ${
    !ui.selectedCell ? "panel-hidden" : ""
  }`}
>

// Enhanced
<aside
  data-testid="detail-panel-container"
  data-visible={!!ui.selectedCell}
  data-active-plugin={ui.activePluginId || "none"}
  data-cell-type={ui.selectedCell ? "present" : "none"}
  className={`bg-zinc-900 border-l border-zinc-800 flex-none panel-transition relative ${
    !ui.selectedCell ? "panel-hidden" : ""
  }`}
>
```

**7. Loading State Container** (when data.loading is true):
```tsx
// Current
<div className="h-screen bg-zinc-950 text-white flex items-center justify-center">

// Enhanced
<div 
  data-testid="loading-container"
  data-loading-phase={loadingProgress.phase}
  data-progress={`${loadingProgress.loaded}/${loadingProgress.total}`}
  className="h-screen bg-zinc-950 text-white flex items-center justify-center"
>
```

**8. Error State Container** (when data.error exists):
```tsx
// Current
<div className="h-screen bg-zinc-950 text-white">

// Enhanced
<div 
  data-testid="error-container"
  data-error-present="true"
  className="h-screen bg-zinc-950 text-white"
>
```

### Implementation Notes

**Key Challenge:** App.tsx has many render branches (loading, error, normal). Need to ensure attributes are consistent across all branches.

**Testing Strategy:**
1. Add attributes to normal render path first
2. Test thoroughly
3. Add to loading state
4. Add to error state
5. Verify all tests still pass

**Mutual Exclusivity Documentation:**
The store automatically closes one panel when the other opens. This should be visible:
- When `data-visible="true"` on detail-panel-container → filter-panel-container should have `data-visible="false"`
- When `data-visible="true"` on filter-panel-container → detail-panel-container should have `data-visible="false"`

### What This Enables (Debug Scenarios)

**Scenario 1: "Filter panel disappeared"**
```javascript
// Before: Guess why, check React DevTools, add console.logs
// After: Open DevTools → Elements
document.querySelector('[data-testid="filter-panel-container"]').dataset
// → { visible: "false", pluginOwned: "false", activePlugin: "treemap-explorer" }
document.querySelector('[data-testid="detail-panel-container"]').dataset  
// → { visible: "true", cellType: "present" }
// INSIGHT: Detail panel opened, which auto-closed filters (mutual exclusivity)
```

**Scenario 2: "Plugin stuck loading"**
```javascript
// Before: Refresh, hope it works
// After: Open DevTools → Elements
document.querySelector('[data-testid="app-container"]').dataset
// → { loading: "true", loadingPhase: "processing", pluginDataReady: "false" }
// INSIGHT: Stuck in processing phase, not data loading
```

**Scenario 3: "Filter button shows count but no filters visible"**
```javascript
// Before: Confusion, assume bug
// After:  
document.querySelector('[data-testid="filters-toggle"]').dataset
// → { active: "false", hasActiveFilters: "true", filterCount: "3" }
// INSIGHT: Filters are active (3) but panel is closed - working as designed
```

### Success Criteria

**Functional Tests:**
- [ ] Run `pnpm test` - all App.tsx tests pass unchanged
- [ ] Type checking passes: `pnpm type-check`
- [ ] Build succeeds: `pnpm build`

**Visual Verification (Development):**
- [ ] `pnpm dev` → Open DevTools → Elements panel
- [ ] Verify `app-container` shows loading state correctly
- [ ] Switch plugins → verify `data-active-plugin` updates
- [ ] Open filter panel → verify `data-visible` changes to "true"
- [ ] Select a file → verify detail panel `data-visible="true"` AND filter panel `data-visible="false"` (mutual exclusivity)
- [ ] Check filter toggle button → verify `data-has-active-filters` reflects actual filter state

**Loading State Verification:**
- [ ] Reload page → check `data-loading-phase` transitions (metadata → processing → complete)
- [ ] Force error (disconnect network) → verify error container attributes

### Files Modified
- `src/App.tsx`

### Rollback Strategy
```bash
git checkout src/App.tsx
```

---

## Phase 1: FilterPanel Enrichment
**Target:** Most complex component state  
**Estimated Time:** 45-60 minutes  
**Risk:** Minimal  
**Value:** Very High

### Current Problems

**Test Brittleness:**
```typescript
// From FilterPanel.test.tsx - VERY BRITTLE
fireEvent.click(screen.getByText("Alice"));        // Breaks if name changes
fireEvent.click(screen.getByText("ts"));           // Breaks if extension changes  
const expandButton = screen.getByText(/Show All 6 Authors/);  // Breaks if count changes
```

**Invisible State:**
- Can't see filter counts in DevTools
- Can't verify search is active
- Can't check expansion state
- Can't identify which filters are selected

### Attributes to Add

**1. FilterPanel Root Container:**
```tsx
// Current
<div
  className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-xl"
  data-testid="filter-panel"
>

// Enhanced
<div
  className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-xl"
  data-testid="filter-panel"
  data-state={hasActiveFilters ? "filtered" : "empty"}
  data-active-filter-count={selectedAuthors.size + selectedExtensions.size}
  data-author-count={selectedAuthors.size}
  data-extension-count={selectedExtensions.size}
  data-search-active={authorSearch.trim() !== ""}
  data-authors-expanded={authorsExpanded}
  data-total-authors={totalAuthors}
>
```

**2. Author Search Input** (already has testid, add state):
```tsx
// Current
<input
  type="text"
  data-testid="author-search"
  value={authorSearch}
  onChange={(e) => setAuthorSearch(e.target.value)}
  placeholder="Search authors..."
  className="w-full bg-zinc-800..."
/>

// Enhanced (add state attribute)
<input
  type="text"
  data-testid="author-search"
  data-has-value={authorSearch.trim() !== ""}
  data-result-count={displayedAuthorItems.length}
  value={authorSearch}
  onChange={(e) => setAuthorSearch(e.target.value)}
  placeholder="Search authors..."
  className="w-full bg-zinc-800..."
/>
```

**3. Expand/Collapse Button:**
```tsx
// Current
{!authorSearch.trim() && totalAuthors > TOP_AUTHORS_LIMIT && (
  <button
    onClick={() => setAuthorsExpanded(!authorsExpanded)}
    className="w-full py-2 px-3 text-xs font-medium..."
  >

// Enhanced
{!authorSearch.trim() && totalAuthors > TOP_AUTHORS_LIMIT && (
  <button
    onClick={() => setAuthorsExpanded(!authorsExpanded)}
    data-testid="toggle-authors-expansion"
    data-state={authorsExpanded ? "expanded" : "collapsed"}
    data-showing={authorsExpanded ? totalAuthors : TOP_AUTHORS_LIMIT}
    data-total={totalAuthors}
    className="w-full py-2 px-3 text-xs font-medium..."
  >
```

**4. Individual Author Items** (in AuthorItem component):
```tsx
// Current
const AuthorItem: React.FC<AuthorItemProps> = ({
  name,
  count,
  isSelected,
  onToggle,
}) => (
  <div
    onClick={onToggle}
    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer...`}
  >

// Enhanced
const AuthorItem: React.FC<AuthorItemProps> = ({
  name,
  count,
  isSelected,
  onToggle,
}) => (
  <div
    onClick={onToggle}
    data-testid={`filter-author-${name.toLowerCase().replace(/\s+/g, '-')}`}
    data-selected={isSelected}
    data-count={count}
    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer...`}
  >
```

**5. File Type Pills** (in FileTypePill component):
```tsx
// Current
const FileTypePill: React.FC<FileTypePillProps> = ({
  extension,
  count,
  isSelected,
  onToggle,
}) => (
  <button
    onClick={onToggle}
    className={`px-4 py-2 rounded-full text-sm font-mono transition-all...`}
  >

// Enhanced
const FileTypePill: React.FC<FileTypePillProps> = ({
  extension,
  count,
  isSelected,
  onToggle,
}) => (
  <button
    onClick={onToggle}
    data-testid={`filter-ext-${extension}`}
    data-selected={isSelected}
    data-count={count}
    className={`px-4 py-2 rounded-full text-sm font-mono transition-all...`}
  >
```

**6. Reset Button** (already has testid, add state):
```tsx
// Current
<button
  onClick={handleClearFilters}
  data-testid="reset-filters"
  disabled={!hasActiveFilters}
  className={...}
>

// Enhanced (add enabled state)
<button
  onClick={handleClearFilters}
  data-testid="reset-filters"
  data-enabled={hasActiveFilters}
  disabled={!hasActiveFilters}
  className={...}
>
```

### What This Enables

**Future Test Stability:**
```typescript
// OLD (breaks when UI changes):
fireEvent.click(screen.getByText("Alice"));
expect(screen.getByText("Alice")).toHaveClass("bg-purple-900/30");

// NEW (resilient to UI changes):
fireEvent.click(screen.getByTestId("filter-author-alice"));
expect(screen.getByTestId("filter-author-alice"))
  .toHaveAttribute('data-selected', 'true');

// BONUS: Can verify state directly
expect(screen.getByTestId("filter-panel"))
  .toHaveAttribute('data-author-count', '1');
```

**Production Debugging:**
```javascript
// Check filter state instantly in DevTools
document.querySelector('[data-testid="filter-panel"]').dataset
// → { 
//   state: "filtered",
//   activeFilterCount: "5", 
//   authorCount: "3",
//   extensionCount: "2",
//   searchActive: "false",
//   authorsExpanded: "true"
// }
```

### Success Criteria

**Functional Tests:**
- [ ] Run `pnpm test` - all FilterPanel tests pass unchanged
- [ ] Type checking passes: `pnpm type-check`

**Visual Verification (Development):**
- [ ] `pnpm dev` → Open filter panel → DevTools Elements
- [ ] Verify `data-state` changes from "empty" to "filtered" when selecting filters
- [ ] Search for author → verify `data-search-active="true"`
- [ ] Verify `data-result-count` updates as you type
- [ ] Toggle filters → verify `data-selected` updates on individual items
- [ ] Click expand → verify `data-state="expanded"`
- [ ] Verify counts match: `data-author-count` + `data-extension-count` = `data-active-filter-count`

**Edge Cases:**
- [ ] Clear all filters → verify `data-state="empty"`, all counts = "0"
- [ ] Search with no results → verify `data-result-count="0"`
- [ ] Expand with <5 authors total → verify expand button doesn't render

### Files Modified
- `src/components/common/FilterPanel.tsx`

### Rollback Strategy
```bash
git checkout src/components/common/FilterPanel.tsx
```

### Implementation Notes

**Sanitize author names for testids:**
```typescript
// Handle special characters in names
const sanitizeName = (name: string) => 
  name.toLowerCase()
    .replace(/\s+/g, '-')      // Spaces → hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special chars
    .replace(/^-+|-+$/g, '');   // Trim hyphens

data-testid={`filter-author-${sanitizeName(name)}`}
```

**Watch out for:**
- Names with special characters: "O'Brien" → "obrien"
- Names with spaces: "John Doe" → "john-doe"  
- Extension with dots: ".tsx" → use as-is (just "tsx")

---

## Phase 2: Navigation & Control Components
**Target:** PluginSelector + LensModeSelector + MetricSelector + TimeBinSelector  
**Estimated Time:** 45-60 minutes  
**Risk:** Minimal  
**Value:** High

### Component 1: PluginSelector

**Current State:** Has good testids, needs state exposure

**Attributes to Add:**

```tsx
// Main selector button
<button
  onClick={() => setIsOpen(!isOpen)}
  data-testid="viz-selector"
  data-state={isOpen ? "open" : "closed"}
  data-active-plugin={activePlugin?.metadata.id || "none"}
  data-plugin-count={plugins.length}
  className="flex items-center gap-2 px-3 py-1.5..."
  title="Select Visualization"
  aria-label="Select Visualization"
>
```

```tsx
// Dropdown portal container
<div
  id="plugin-selector-dropdown"
  data-testid="viz-dropdown"
  data-visible={isOpen}
  data-plugin-count={plugins.length}
  data-active-plugin={ui.activePluginId}
  className="fixed bg-zinc-900 border border-zinc-700..."
  style={{...}}
>
```

```tsx
// Individual plugin buttons (already have testid, add active state)
<button
  key={plugin.metadata.id}
  data-testid={`viz-${plugin.metadata.id}`}
  data-active={ui.activePluginId === plugin.metadata.id}
  onClick={() => {
    setActivePlugin(plugin.metadata.id);
    setIsOpen(false);
  }}
  className={...}
>
```

### Component 2: LensModeSelector

**Current State:** Has testid pattern, needs container + active state

**Attributes to Add:**

```tsx
// Container div
<div 
  className="flex gap-2" 
  role="group" 
  aria-label="Lens mode selector"
  data-testid="lens-mode-selector"
  data-active-lens={currentLens}
  data-lens-count={lenses.length}
>
```

```tsx
// Individual lens buttons (already have testid, add active state)
<button
  key={lens.id}
  data-testid={`lens-${lens.id}`}
  data-active={isActive}
  onClick={() => onLensChange(lens.id)}
  className={...}
  aria-pressed={isActive}
  title={lens.description}
>
```

### Component 3: MetricSelector

**Current State:** No testids at all, needs full instrumentation

**Attributes to Add:**

```tsx
// Container div
<div 
  className="flex items-center gap-2"
  data-testid="metric-selector"
  data-active-metric={currentValue}
  data-mode={isControlled ? "controlled" : "uncontrolled"}
>
  <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
```

```tsx
// Individual metric buttons
{options.map((option) => (
  <button
    key={option.value}
    data-testid={`metric-${option.value}`}
    data-active={currentValue === option.value}
    onClick={() => handleChange(option.value)}
    className={...}
  >
```

### Component 4: TimeBinSelector

**Current State:** No testids at all, needs full instrumentation

**Attributes to Add:**

```tsx
// Container div
<div 
  className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800"
  data-testid="timebin-selector"
  data-active-bin={currentValue}
  data-mode={isControlled ? "controlled" : "uncontrolled"}
>
```

```tsx
// Individual bin buttons
{options.map((option) => (
  <button
    key={option.value}
    data-testid={`timebin-${option.value}`}
    data-active={currentValue === option.value}
    onClick={() => handleChange(option.value)}
    className={...}
    title={`Group by ${option.label}`}
  >
```

### What This Enables

**Debugging Scenarios:**

**1. "Which plugin is actually active?"**
```javascript
document.querySelector('[data-testid="viz-selector"]').dataset.activePlugin
// → "treemap-explorer"
```

**2. "Is this control plugin-owned or global?"**
```javascript
document.querySelector('[data-testid="metric-selector"]').dataset.mode
// → "controlled" (plugin owns it) or "uncontrolled" (global store)
```

**3. "Which lens/metric/timebin is selected?"**
```javascript
// All visible in Elements panel without digging through React DevTools
document.querySelector('[data-testid="lens-mode-selector"]').dataset.activeLens
document.querySelector('[data-testid="metric-selector"]').dataset.activeMetric
document.querySelector('[data-testid="timebin-selector"]').dataset.activeBin
```

### Success Criteria

**Functional Tests:**
- [ ] Run `pnpm test` - all tests pass unchanged
- [ ] Type checking passes: `pnpm type-check`

**Visual Verification (Development - do for each component):**

**PluginSelector:**
- [ ] `pnpm dev` → Open DevTools → Elements
- [ ] Verify `data-active-plugin` matches current selection
- [ ] Click selector → verify `data-state="open"`
- [ ] Switch plugins → verify `data-active-plugin` updates
- [ ] Verify dropdown `data-visible="true"` when open

**LensModeSelector:**
- [ ] Switch to Treemap plugin (only one with lens selector)
- [ ] Verify `data-active-lens` shows current lens ("debt", "coupling", or "time")
- [ ] Click lens button → verify `data-active-lens` updates
- [ ] Verify only one lens has `data-active="true"` at a time

**MetricSelector:**
- [ ] Verify `data-active-metric` matches current selection
- [ ] Switch metrics → verify updates
- [ ] Check `data-mode` shows "controlled" or "uncontrolled"

**TimeBinSelector:**
- [ ] Verify `data-active-bin` matches current selection
- [ ] Switch bins → verify updates
- [ ] Check `data-mode` shows "controlled" or "uncontrolled"

### Files Modified
- `src/components/layout/PluginSelector.tsx`
- `src/plugins/treemap-explorer/components/LensModeSelector.tsx`
- `src/components/common/MetricSelector.tsx`
- `src/components/common/TimeBinSelector.tsx`

### Rollback Strategy
```bash
# Individual files
git checkout src/components/layout/PluginSelector.tsx
git checkout src/plugins/treemap-explorer/components/LensModeSelector.tsx
git checkout src/components/common/MetricSelector.tsx
git checkout src/components/common/TimeBinSelector.tsx

# Or all at once
git checkout src/components/layout/ src/plugins/treemap-explorer/components/LensModeSelector.tsx src/components/common/MetricSelector.tsx src/components/common/TimeBinSelector.tsx
```

### Implementation Notes

**Controlled vs Uncontrolled Mode:**  
MetricSelector and TimeBinSelector support both modes:
- **Controlled:** Plugin passes value + onChange
- **Uncontrolled:** Reads/writes to global store

The `data-mode` attribute exposes which mode is active.

---

## Phase 3: TreemapExplorerControls
**Target:** Treemap-specific control container  
**Estimated Time:** 15-20 minutes  
**Risk:** Minimal  
**Value:** Medium

### Attributes to Add

**Controls Container:**
```tsx
// Current
export const TreemapExplorerControls: React.FC<
  PluginControlProps<TreemapExplorerState>
> = ({ state, updateState }) => {
  const lensMode = state.lensMode || "debt";
  const sizeMetric = state.sizeMetric || "commits";

  return (
    <>
      <LensModeSelector... />
      <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
        {sizeMetrics.map((metric) => (
          <button
            key={metric.id}
            data-testid={`metric-${metric.id}`}
            onClick={...}
          >

// Enhanced (wrap in container + add size metric state)
export const TreemapExplorerControls: React.FC<
  PluginControlProps<TreemapExplorerState>
> = ({ state, updateState }) => {
  const lensMode = state.lensMode || "debt";
  const sizeMetric = state.sizeMetric || "commits";

  return (
    <div 
      data-testid="treemap-controls"
      data-lens-mode={lensMode}
      data-size-metric={sizeMetric}
    >
      {/* LensModeSelector already enriched in Phase 2 */}
      <LensModeSelector
        currentLens={lensMode}
        onLensChange={(lens) => updateState({ lensMode: lens })}
      />

      {/* Size Metric Selector */}
      <div 
        className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800"
        data-testid="size-metric-selector"
        data-active-metric={sizeMetric}
      >
        {sizeMetrics.map((metric) => (
          <button
            key={metric.id}
            data-testid={`metric-${metric.id}`}
            data-active={sizeMetric === metric.id}
            onClick={() => updateState({ sizeMetric: metric.id as any })}
            className={...}
          >
```

### What This Enables

**Consolidated State View:**
```javascript
// See all treemap control state in one place
document.querySelector('[data-testid="treemap-controls"]').dataset
// → { lensMode: "debt", sizeMetric: "commits" }
```

### Success Criteria

**Functional Tests:**
- [ ] Run `pnpm test` - all TreemapExplorer tests pass unchanged
- [ ] Type checking passes

**Visual Verification:**
- [ ] `pnpm dev` → Switch to Treemap Explorer plugin
- [ ] Verify `data-testid="treemap-controls"` exists in header
- [ ] Switch lens mode → verify `data-lens-mode` updates
- [ ] Switch size metric → verify both `data-size-metric` and `data-active-metric` update
- [ ] Verify consistency with child LensModeSelector state

### Files Modified
- `src/plugins/treemap-explorer/components/TreemapExplorerControls.tsx`

### Rollback Strategy
```bash
git checkout src/plugins/treemap-explorer/components/TreemapExplorerControls.tsx
```

---

## Phase 4: Detail Panels (Optional)
**Target:** TreemapDetailPanel + CellDetailPanel  
**Estimated Time:** 20-30 minutes  
**Risk:** Minimal  
**Value:** Low-Medium

### Component 1: TreemapDetailPanel

**Attributes to Add:**

```tsx
// Main panel container
<div
  className="absolute top-0 right-0 h-full w-96..."
  data-testid="detail-panel"
  data-lens-mode={lensMode}
  data-file-path={file.key}
  data-file-name={file.key.split("/").pop()}
  data-has-coupling-data={lensMode === "coupling" && !!couplingIndex}
  data-coupling-threshold={lensMode === "coupling" ? couplingThreshold : undefined}
>
```

### Component 2: CellDetailPanel

**Attributes to Add:**

```tsx
// Panel container (need to check actual component structure)
<div
  data-testid="cell-detail-panel"
  data-cell-type={cell ? "present" : "none"}
  data-has-data={!!cell}
>
```

### Success Criteria

**Functional Tests:**
- [ ] Run `pnpm test` - all detail panel tests pass unchanged

**Visual Verification:**
- [ ] Treemap: Select a file → verify `data-file-path` shows correct path
- [ ] Treemap: Switch lens modes → verify `data-lens-mode` updates
- [ ] Timeline: Click cell → verify cell detail attributes

### Files Modified
- `src/plugins/treemap-explorer/components/TreemapDetailPanel.tsx`
- `src/plugins/timeline-heatmap/components/CellDetailPanel.tsx`

### Rollback Strategy
```bash
git checkout src/plugins/treemap-explorer/components/TreemapDetailPanel.tsx
git checkout src/plugins/timeline-heatmap/components/CellDetailPanel.tsx
```

---

## Testing Strategy (Universal - Apply to All Phases)

### Pre-Implementation Checklist
```bash
# Ensure clean baseline before each phase
git status                    # Should be clean
pnpm test                    # All tests passing
pnpm type-check              # No type errors
```

### During Implementation

**Incremental Approach:**
1. Add attributes to one component/section at a time
2. Save file
3. Run `pnpm type-check` (faster than tests, catches syntax errors)
4. If type errors, fix immediately
5. Continue to next section

**Browser DevTools:**
- Keep `pnpm dev` running in parallel
- Reload after each file save
- Open DevTools → Elements panel
- Verify attributes appear and update correctly

### Post-Implementation Verification (Per Phase)

**1. Automated Tests:**
```bash
# Must all pass - no exceptions
pnpm type-check              # Type safety
pnpm test                    # All unit tests  
pnpm test:coverage           # Coverage check (optional)
```

**2. Visual Verification:**
```bash
pnpm dev
```

Then for each modified component:
- Open in browser
- Open DevTools → Elements panel
- Interact with component (toggle, select, etc.)
- Verify attributes update in real-time
- Check that values make sense

**3. Cross-Component Verification:**

After Phase 0 (App.tsx):
- Verify mutual exclusivity: Open filter panel → detail panel container should show `data-visible="false"`
- Verify plugin switching: Change plugin → all `data-active-plugin` attributes update

After Phase 1 (FilterPanel):
- Verify filter counts: App's filter toggle `data-filter-count` should match FilterPanel's `data-active-filter-count`

After Phase 2 (Navigation):
- Verify consistency: App's `data-active-plugin` should match PluginSelector's `data-active-plugin`

### Regression Testing Checklist

- [ ] All existing unit tests pass (`pnpm test`)
- [ ] All existing E2E tests pass (if you run them)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No console errors in development
- [ ] No console warnings about invalid attributes
- [ ] Attributes visible in Chrome DevTools Elements panel
- [ ] Attribute values update when state changes
- [ ] No performance degradation (attributes are lightweight)

### If Tests Fail

**Step 1: Identify the failure**
```bash
pnpm test --reporter=verbose
```

**Step 2: Check for common issues**
- Typo in attribute name?
- Missing closing quote or bracket?
- TypeScript error (component props changed)?
- Added attribute to wrong element?

**Step 3: Rollback and retry**
```bash
# Rollback the specific file
git checkout path/to/file.tsx

# Or rollback entire phase
git checkout src/components/
```

**Step 4: Implement incrementally**
- Add attributes to one element at a time
- Test after each addition
- Identify exactly which attribute causes the issue

---

## Naming Conventions Reference

### Established Patterns from Existing Code

**testid Format:** `data-testid="{category}-{item}"`
- Component identity: `filter-panel`, `detail-panel`, `app-container`
- Actions: `filters-toggle`, `reset-filters`, `toggle-authors-expansion`
- Dynamic items: `viz-{pluginId}`, `lens-{lensId}`, `filter-author-{name}`

**State Attributes:** Follow HTML boolean/enum pattern
- Boolean flags: `data-active="true"` / `"false"`
- State enums: `data-state="open"` / `"closed"` / `"expanded"` / `"collapsed"`
- Active selection: `data-active-{category}="{value}"`
- Presence: `data-visible="true"` / `"false"`
- Counts: `data-{category}-count="{number}"`

### Complete Attribute Vocabulary

**State Indicators:**
```tsx
data-state="open|closed|expanded|collapsed|filtered|empty"
data-active="true|false"
data-selected="true|false"
data-visible="true|false"
data-enabled="true|false"
data-disabled="true|false"
data-loading="true|false"
data-has-error="true|false"
```

**Active Selections:**
```tsx
data-active-plugin="{pluginId}"
data-active-lens="debt|coupling|time"
data-active-metric="commits|events|authors"
data-active-bin="week|month|quarter"
```

**Counts and Metrics:**
```tsx
data-filter-count="{number}"
data-author-count="{number}"
data-extension-count="{number}"
data-result-count="{number}"
data-total="{number}"
data-showing="{number}"
```

**Composite State:**
```tsx
data-has-active-filters="true|false"
data-has-coupling-data="true|false"
data-plugin-owned="true|false"
data-uses-plugin-controls="true|false"
data-search-active="true|false"
data-authors-expanded="true|false"
```

**Loading States:**
```tsx
data-loading="true|false"
data-loading-phase="metadata|processing|complete"
data-plugin-data-ready="true|false"
```

**Content References:**
```tsx
data-file-path="/path/to/file.ts"
data-file-name="file.ts"
data-cell-type="present|none"
data-mode="controlled|uncontrolled"
```

### Value Guidelines

**Use consistent values across components:**
- Boolean: Always `"true"` or `"false"` (strings, not JavaScript booleans)
- Enums: Lowercase, hyphen-separated: `"open"`, `"treemap-explorer"`
- Counts: String numbers: `"0"`, `"5"`, `"42"`
- Paths: Use actual paths: `"/src/components/App.tsx"`

**Do NOT:**
- Use computed values: `data-filter-count={selectedAuthors.size + selectedExtensions.size}` ← Correct
- Store complex objects: `data-config={JSON.stringify(config)}` ← Wrong
- Store timestamps: `data-last-updated="2024-01-15..."` ← Wrong (unless actually needed)

---

## Benefits Delivered (Cumulative by Phase)

### After Phase 0 (App.tsx)
**Production Debugging:**
- See loading phase instantly (stuck on "processing" vs "metadata")
- Verify which plugin is actually active
- Check panel visibility and mutual exclusivity
- Confirm filter state globally

**Future Testing:**
- Stable selector for app container
- Loading phase assertions
- Plugin switching verification
- Panel visibility tests

### After Phase 1 (FilterPanel)
**Production Debugging:**
- See all filter counts at a glance
- Verify search state
- Check expansion state
- Identify selected filters

**Future Testing:**
- Replace brittle `getByText("Alice")` with stable `getByTestId("filter-author-alice")`
- State-based assertions (selected, expanded, etc.)
- Count verification

### After Phase 2 (Navigation & Controls)
**Production Debugging:**
- Verify plugin selection
- Check lens/metric/timebin state
- See if controls are plugin-owned or global

**Future Testing:**
- Plugin switching tests
- Control selection verification  
- Mode detection (controlled vs uncontrolled)

### After Phase 3 (TreemapExplorerControls)
**Production Debugging:**
- Consolidated treemap control state
- Verify lens + size metric combination

**Future Testing:**
- Treemap-specific control tests

### After Phase 4 (Detail Panels)
**Production Debugging:**
- See selected file/cell
- Verify lens mode context

**Future Testing:**
- Detail panel state verification

---

## Risk Assessment & Mitigation

| Phase | Risk Level | Primary Risks | Mitigation |
|-------|-----------|---------------|------------|
| **Phase 0** | **Low-Medium** | Most critical component; errors affect everything | Test thoroughly; rollback immediately if issues |
| **Phase 1** | **Low** | Complex component but isolated | Incremental implementation; test after each section |
| **Phase 2** | **Very Low** | 4 simple components | Similar patterns; do one at a time |
| **Phase 3** | **Very Low** | Just a wrapper | Depends on Phase 2; minimal new code |
| **Phase 4** | **Very Low** | Optional; simple panels | Can skip entirely if needed |

**Overall Risk:** Very Low
- No behavioral changes
- No test modifications required
- Attributes are passive metadata
- Easy rollback per component or per phase
- TypeScript catches attribute typos

**Risk Factors That Would Elevate Concern:**
- Adding attributes to elements that have event handlers ← Not doing this; attributes are declarative
- Modifying test files ← Not doing this; tests unchanged
- Changing component behavior ← Not doing this; only adding metadata
- Breaking existing testids ← Not doing this; keeping all existing testids

---

## Future Opportunities (Post-Implementation)

### 1. E2E Test Modernization (Playwright)

**Current approach (brittle):**
```typescript
// Fails if text changes
await page.getByTitle('Filters').click();
```

**With data attributes (resilient):**
```typescript
// Stable, semantic selectors
await page.getByTestId('filters-toggle').click();
await expect(page.getByTestId('filters-toggle'))
  .toHaveAttribute('data-active', 'true');

// State-based assertions
await expect(page.getByTestId('filter-panel'))
  .toHaveAttribute('data-active-filter-count', '3');
```

### 2. Production Debugging Workflow

**Before:**
1. User reports "filters disappeared"
2. Can't reproduce locally
3. Ask user for screenshot
4. Try to guess what happened
5. Add console.logs and ask user to try again

**After:**
1. User reports "filters disappeared"
2. Ask user to open DevTools → Elements
3. Share data attributes: `document.querySelector('[data-testid="filter-panel-container"]').dataset`
4. Instantly see: `{ visible: "false", pluginOwned: "false", activePlugin: "treemap" }`
5. Check detail panel: `{ visible: "true" }` ← Aha! Mutual exclusivity
6. Explain to user: "The detail panel auto-closes filters when opened"

### 3. Automated Testing Improvements

**Component state verification:**
```typescript
// Verify complex state without prop drilling
expect(screen.getByTestId('filter-panel'))
  .toHaveAttribute('data-state', 'filtered');
expect(screen.getByTestId('filter-panel'))
  .toHaveAttribute('data-author-count', '2');
expect(screen.getByTestId('filter-panel'))
  .toHaveAttribute('data-extension-count', '1');
```

**Multi-component consistency:**
```typescript
// Verify app and component agree on state
const appFilterCount = screen.getByTestId('filters-toggle')
  .getAttribute('data-filter-count');
const panelFilterCount = screen.getByTestId('filter-panel')
  .getAttribute('data-active-filter-count');
expect(appFilterCount).toBe(panelFilterCount);
```

### 4. Development Workflow

**Quick state inspection:**
```javascript
// Console helper function
function inspectState() {
  const selectors = [
    'app-container',
    'filter-panel',
    'filters-toggle',
    'viz-selector',
    'lens-mode-selector'
  ];
  
  return selectors.reduce((acc, id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    acc[id] = el ? el.dataset : 'not found';
    return acc;
  }, {});
}

// Then in browser console:
inspectState()
```

### 5. Documentation & Onboarding

**Living documentation:**
- New developers can inspect components in DevTools to understand state
- Attributes serve as inline documentation of component behavior
- No need to dig through React DevTools for simple state checks

---

## Success Metrics

### Quantitative Goals
- [ ] **0 test regressions** across all phases
- [ ] **9 components enriched** with state attributes
- [ ] **30+ new debugging data points** available in DevTools
- [ ] **0 production bundle size impact** (attributes compress well with gzip)
- [ ] **100% backward compatible** (all existing testids preserved)

### Qualitative Goals
- [ ] **Faster debugging** - State visible in Elements panel, no React DevTools needed
- [ ] **More confident refactoring** - Stable selectors available when tests break
- [ ] **Easier onboarding** - New developers can see state in browser
- [ ] **Better production diagnosis** - Users can share state via data attributes
- [ ] **Future-proof tests** - When rewriting tests, stable selectors ready

### Per-Phase Success Indicators

**Phase 0 (App.tsx):**
- Can answer "which plugin is active?" without opening React DevTools
- Can see loading phase in real-time
- Can verify panel mutual exclusivity visually

**Phase 1 (FilterPanel):**
- Can see filter counts and search state instantly
- Can identify selected filters without clicking
- Filter state visible at component and app level

**Phase 2 (Navigation):**
- All control selections visible in Elements panel
- Can verify plugin/lens/metric/bin state at a glance

**Phase 3-4 (Integration & Panels):**
- Complete state visibility across entire application
- Consistent attribute patterns throughout codebase

---

## Decision Points & Iteration Strategy

After each phase, evaluate:
1. **Continue?** Has this provided value in practice?
2. **Adjust?** Should we modify the approach for subsequent phases?
3. **Pause?** Is now a good time to stop and observe?

Each phase is independently valuable. You can stop after any phase.

---

## Appendix A: Quick Reference Cards

### Implementation Checklist (Per Phase)

```
□ Read phase description carefully
□ Review attributes to add
□ Ensure clean git state
□ Run baseline tests (pnpm test)
□ Implement attributes incrementally
□ Test after each file
□ Run full test suite
□ Verify in browser DevTools
□ Commit changes
□ Document any deviations
```

### Common Commands

```bash
# Before starting
git status
pnpm test && pnpm type-check

# During implementation
pnpm type-check  # Fast syntax check
pnpm dev         # Live browser testing

# After completion
pnpm test && pnpm type-check && pnpm build

# If issues arise
git checkout path/to/file.tsx
git diff path/to/file.tsx
```

### DevTools Inspection

```javascript
// Quick state check
document.querySelector('[data-testid="COMPONENT"]').dataset

// Find all elements with data attributes
document.querySelectorAll('[data-testid]')

// Check specific attribute
document.querySelector('[data-testid="COMPONENT"]')
  .getAttribute('data-ATTRIBUTE')

// List all testids
Array.from(document.querySelectorAll('[data-testid]'))
  .map(el => el.dataset.testid)
```

---

## Appendix B: Troubleshooting Guide

### Problem: Tests fail after adding attributes

**Symptom:** Tests that passed before now fail

**Possible Causes:**
1. Typo in attribute name or value
2. Missing closing quote or bracket
3. Attribute breaks existing selector
4. TypeScript error in attribute value

**Solution:**
```bash
# Check exact error
pnpm test --reporter=verbose

# Verify TypeScript
pnpm type-check

# Rollback and retry incrementally
git checkout path/to/file.tsx
```

### Problem: Attributes don't appear in DevTools

**Symptom:** Added attributes but can't see them in Elements panel

**Possible Causes:**
1. Wrong element selected in DevTools
2. Conditional rendering - element not currently rendered
3. Typo in testid when searching
4. Browser cache (unlikely but possible)

**Solution:**
- Refresh page (Cmd+R / Ctrl+R)
- Search for testid in Elements panel (Cmd+F / Ctrl+F)
- Check if element is conditionally rendered
- Verify attribute exists in source code

### Problem: Attribute values don't update

**Symptom:** Attributes visible but show stale values

**Possible Causes:**
1. Using literal values instead of state variables
2. Component not re-rendering
3. Memoization preventing updates

**Solution:**
- Verify attribute uses state variable: `data-active={isActive}` not `data-active="true"`
- Check component re-renders when state changes
- Add console.log to verify state updates

### Problem: TypeScript errors on custom attributes

**Symptom:** TS2322: Type error on data attributes

**Possible Causes:**
1. TypeScript strict mode
2. Using non-string attribute values

**Solution:**
```tsx
// Ensure all attribute values are strings or booleans
data-count={count.toString()}  // If count is number
data-active={isActive}          // If isActive is boolean
data-state={status}             // If status is string
```

---

## Appendix C: Migration Path for Existing Tests

**Note:** This plan doesn't require test changes. But when you eventually refactor tests, here's the migration pattern:

### Pattern 1: Text Selectors → testid

**Before:**
```typescript
fireEvent.click(screen.getByText("Alice"));
```

**After:**
```typescript
fireEvent.click(screen.getByTestId("filter-author-alice"));
```

### Pattern 2: Class-based Assertions → Attribute-based

**Before:**
```typescript
expect(element).toHaveClass("bg-purple-900/30");
```

**After:**
```typescript
expect(element).toHaveAttribute('data-selected', 'true');
```

### Pattern 3: Complex Queries → Simple testid

**Before:**
```typescript
const button = container.querySelector('button.flex.items-center');
```

**After:**
```typescript
const button = screen.getByTestId('filters-toggle');
```

### Pattern 4: State Verification via Props → Attribute Inspection

**Before:**
```typescript
// Can't easily verify internal state
```

**After:**
```typescript
expect(screen.getByTestId('filter-panel'))
  .toHaveAttribute('data-active-filter-count', '3');
```

---

## Final Notes

**This plan is comprehensive but flexible.** You can:
- Implement phases in order (recommended)
- Skip phases if not valuable
- Adjust attributes based on discoveries
- Stop at any point

**The goal is pragmatic improvement, not perfection.** Even Phase 0 alone provides significant value. Each subsequent phase is incremental value add.

**Start small, measure value, iterate.** Begin with Phase 0 in your next session. After that, decide whether to continue based on the value you experience.

Good luck with implementation! 🚀