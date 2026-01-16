# Treemap Explorer - Phased Implementation Plan

**Project:** Git Repository Visualization - Treemap Explorer Plugin  
**Target Timeline:** 10-14 days for full implementation  
**Architecture:** Plugin-based extension of existing git-viz application

---

## 📚 Reference Materials

### Primary References

1. **STATIC_MOCKUP_treemap_explorer.html** - Visual/UX Reference
   - Fully functional Alpine.js mockup demonstrating all interactions
   - Layout, styling, color schemes, transitions
   - Component hierarchy and positioning
   - Mock data structures and API shapes

2. **STORY_TREEMAP_EXPLORER.md** - Narrative/Feel Reference
   - User journey and interaction flows
   - Emotional response targets ("discovery", "insight", "actionability")
   - Information disclosure patterns (hover → click → detail)
   - Performance expectations (sub-100ms interactions)

3. **Existing Codebase**
   - `src/plugins/treemap-animation/TreemapPlugin.ts` - Foundation to extend
   - `src/components/timeline-heatmap/components/CellDetailPanel.tsx` - Detail panel pattern
   - `src/components/common/FilterPanel.tsx` - Filter UI pattern
   - `src/store/appStore.ts` - State management patterns

### Design Principles from Story

> "Every pixel serves understanding... Space as the primary dimension... Color as semantic layer... Interaction rewards curiosity... Dark theme for extended analysis... Minimal chrome, maximal data"

### Key UX Requirements from Mockup

- **Lens mode switching**: 3 modes (Debt/Coupling/Time) with persistent spatial layout
- **Detail panel**: Slides from right, contextual content per lens, auto-close on filter open
- **Timeline scrubber**: Appears on hover (Time lens only), 1384-day range
- **Coupling arcs**: Curved paths, thickness = strength, visible only when cell selected
- **Filter panel**: Right sidebar, lens-specific controls, active state indicators
- **Dimming behavior**: Selected cell at 100%, others at 10% opacity

---

## 🎯 Implementation Strategy

### Core Architecture Decision

**Single Plugin with Mode Toggle** (not 3 separate plugins)

**Rationale:**
- Maintains spatial consistency - cells stay positioned across lens switches
- Shared treemap layout computation
- Mode = data transform + color remap, not full re-render
- Matches mockup architecture

### Technology Stack

- **Layout**: D3.js treemap (existing)
- **Interactions**: React event handlers (not Alpine.js)
- **State**: Zustand store with plugin-specific state slice
- **Styling**: Tailwind CSS (existing)
- **Arcs**: SVG paths (Canvas fallback if performance issues)
- **Charts**: D3.js micro-visualizations (sparklines)

---

## 📦 Phase 1: Foundation & Debt Lens (3-4 days)

**Goal:** Establish core treemap infrastructure with health-based visualization

**Deliverable:** Working Treemap Explorer with Debt Lens mode, health scoring, basic detail panel

### 1.1 Health Score Calculator (Day 1, Morning)

**File:** `src/services/data/HealthScoreCalculator.ts`

```typescript
export interface HealthScoreInputs {
  totalCommits: number;
  uniqueAuthors: number;
  operations: { M: number; A: number; D: number };
  ageDays: number;
}

export interface HealthScoreResult {
  score: number; // 0-100
  category: 'critical' | 'medium' | 'healthy';
  churnRate: number;
  busFactor: 'high-risk' | 'medium-risk' | 'low-risk';
  factors: {
    churn: { value: number; score: number; weight: number };
    authors: { value: number; score: number; weight: number };
    age: { value: number; score: number; weight: number };
  };
}

export class HealthScoreCalculator {
  // Weights: churn 40%, authors 30%, age 30%
  static calculate(inputs: HealthScoreInputs): HealthScoreResult;
  static categorize(score: number): 'critical' | 'medium' | 'healthy';
  static calculateBusFactor(authors: number): 'high-risk' | 'medium-risk' | 'low-risk';
}
```

**Implementation Notes:**
- Churn rate = M / (M + A + D), inverted scoring (low churn = healthy)
- Author scoring: normalized with diminishing returns (2→5 authors = big jump, 10→20 = small jump)
- Age penalty: files dormant >180 days get 10% penalty, >365 days = 20% penalty
- Reference mockup `getCellColor()` for score bands

**Test Data:** Use `file_index.json` sample files to validate scoring
- `src/types.ts` (822 commits, 96 authors) → should score ~85-90
- `package-lock.json` (345 commits, many authors) → should score ~60-70

---

### 1.2 Enhanced TreemapPlugin Core (Day 1, Afternoon)

**File:** `src/plugins/treemap-explorer/TreemapExplorerPlugin.ts`

Refactor existing `TreemapPlugin.ts` into full-featured explorer:

```typescript
export interface TreemapExplorerState {
  lensMode: 'debt' | 'coupling' | 'time';
  sizeMetric: 'commits' | 'authors' | 'events';
  selectedFile: string | null;
  
  // Debt lens
  healthThreshold: number;
  
  // Coupling lens
  couplingThreshold: number;
  showArcs: boolean;
  
  // Time lens
  timePosition: number; // 0-100
  playing: boolean;
}

export class TreemapExplorerPlugin implements VisualizationPlugin {
  metadata = {
    id: 'treemap-explorer',
    name: 'Treemap Explorer',
    description: 'Spatial code health and coupling analysis',
    version: '2.0.0',
    priority: 2,
    dataRequirements: [
      { dataset: 'file_index', required: true },
      { dataset: 'cochange_network', required: false }, // For coupling
      { dataset: 'temporal_daily', required: false }    // For time
    ]
  };
  
  getInitialState(): TreemapExplorerState {
    return {
      lensMode: 'debt',
      sizeMetric: 'commits',
      selectedFile: null,
      healthThreshold: 30,
      couplingThreshold: 0.3,
      showArcs: true,
      timePosition: 100,
      playing: false
    };
  }
  
  renderControls(props: PluginControlProps): JSX.Element {
    return <TreemapExplorerControls {...props} />;
  }
  
  // processData, render, update methods
}
```

**Key Changes from Existing:**
1. Accepts `file_index.json` instead of `tree` structure
2. Calculates health scores using HealthScoreCalculator
3. Supports three size metrics (not just file count)
4. Color mapping based on lens mode
5. Click handler sets selectedFile in plugin state

**Reference:** Mockup lines 460-550 for data processing logic

---

### 1.3 Lens Mode Controls Component (Day 2, Morning)

**File:** `src/plugins/treemap-explorer/components/LensModeSelector.tsx`

```typescript
interface LensModeSelectorProps {
  currentLens: 'debt' | 'coupling' | 'time';
  onLensChange: (lens: string) => void;
}

export const LensModeSelector: React.FC<LensModeSelectorProps> = ({
  currentLens,
  onLensChange
}) => {
  const lenses = [
    { id: 'debt', label: 'Debt', short: 'DEBT', icon: 'alert-triangle' },
    { id: 'coupling', label: 'Coupling', short: 'COUP', icon: 'git-branch' },
    { id: 'time', label: 'Evolution', short: 'TIME', icon: 'clock' }
  ];
  
  return (
    <div className="flex gap-2">
      {lenses.map(lens => (
        <button
          key={lens.id}
          onClick={() => onLensChange(lens.id)}
          className={cn(
            "px-2 py-1 rounded text-[10px] font-medium transition-all border",
            currentLens === lens.id 
              ? "bg-purple-900/50 text-purple-200 border-purple-700/50"
              : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          )}
        >
          {lens.short}
        </button>
      ))}
    </div>
  );
};
```

**Placement:** In `App.tsx` header, next to plugin selector (global controls area)

**Reference:** Mockup lines 98-107 for exact styling

---

### 1.4 Detail Panel - Debt View (Day 2, Afternoon + Day 3, Morning)

**File:** `src/plugins/treemap-explorer/components/TreemapDetailPanel.tsx`

```typescript
interface TreemapDetailPanelProps {
  file: EnrichedFileData | null;
  lensMode: 'debt' | 'coupling' | 'time';
  onClose: () => void;
}

export const TreemapDetailPanel: React.FC<TreemapDetailPanelProps> = ({
  file,
  lensMode,
  onClose
}) => {
  if (!file) return null;
  
  return (
    <aside className="w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col panel-transition shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex justify-between">
        <div>
          <h3 className="font-mono text-sm font-bold">{file.name}</h3>
          <p className="text-[10px] text-zinc-500 font-mono">{file.path}</p>
        </div>
        <button onClick={onClose}>
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>
      
      {/* Lens-specific content */}
      <div className="flex-1 overflow-y-auto p-4">
        {lensMode === 'debt' && <DebtView file={file} />}
        {lensMode === 'coupling' && <CouplingView file={file} />}
        {lensMode === 'time' && <TimeView file={file} />}
      </div>
    </aside>
  );
};
```

**DebtView Component:** (Priority for Phase 1)
```typescript
const DebtView: React.FC<{ file: EnrichedFileData }> = ({ file }) => {
  return (
    <>
      {/* Health Score Badge */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        file.healthScore.category === 'critical' ? 'bg-red-950/50 border-red-900/50' :
        file.healthScore.category === 'medium' ? 'bg-yellow-950/50 border-yellow-900/50' :
        'bg-green-950/50 border-green-900/50'
      )}>
        <span className="text-xs text-zinc-400">Health Score</span>
        <span className="text-2xl font-bold">{file.healthScore.score}/100</span>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <MetricCard label="Churn Rate" value={`${file.healthScore.churnRate}%`} />
        <MetricCard label="Authors" value={file.uniqueAuthors} />
        <MetricCard label="Age" value={`${file.ageDays} days`} />
        <MetricCard label="Commits" value={file.totalCommits} />
      </div>
      
      {/* Complexity Sparkline */}
      <div className="mt-4">
        <h4 className="text-xs text-zinc-500 mb-2">Complexity Trend</h4>
        <SparklineChart data={file.complexityHistory || []} />
      </div>
      
      {/* AI Insight */}
      <div className="mt-4 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-purple-400 mt-0.5" />
          <p className="text-xs text-zinc-300 leading-relaxed">
            {generateInsight(file)}
          </p>
        </div>
      </div>
    </>
  );
};
```

**Reference:** Mockup lines 222-295 for exact layout and styling

**Insight Generation Logic:** (from mockup lines 591-608)
```typescript
function generateInsight(file: EnrichedFileData): string {
  if (file.healthScore.score < 30) {
    return 'Critical technical debt detected. High churn with low contributor diversity suggests reactive maintenance rather than planned evolution.';
  } else if (file.uniqueAuthors < 2) {
    return 'Bus factor risk: This file has limited expertise distribution. Consider knowledge sharing initiatives.';
  } else {
    return 'Healthy file with sustainable maintenance patterns and good contributor distribution.';
  }
}
```

---

### 1.5 Color Scales & Visual Styling (Day 3, Afternoon)

**File:** `src/plugins/treemap-explorer/utils/colorScales.ts`

```typescript
export const getDebtColor = (healthScore: number): string => {
  // Diverging scale: Green (healthy) → Yellow (medium) → Red (critical)
  if (healthScore >= 70) {
    return `hsl(145, 60%, ${30 + healthScore / 5}%)`; // Green
  } else if (healthScore >= 40) {
    return `hsl(45, 70%, ${40 + healthScore / 4}%)`; // Yellow/Amber
  } else {
    return `hsl(0, 70%, ${30 + healthScore / 3}%)`; // Red
  }
};
```

**Reference:** Mockup lines 552-578 for exact HSL values

**Cell Interaction Styles:** (from mockup CSS)
```css
.treemap-cell {
  transition: all 0.15s ease;
  cursor: pointer;
  stroke: #000;
  stroke-width: 1px;
}

.treemap-cell:hover {
  stroke: #fff;
  stroke-width: 2px;
  filter: brightness(1.2);
}

.treemap-cell.selected {
  stroke: #fff;
  stroke-width: 3px;
}

.treemap-cell.dimmed {
  opacity: 0.1;
}
```

---

### 1.6 Integration & Testing (Day 4)

**Tasks:**
1. Register TreemapExplorerPlugin in `src/plugins/init.ts`
2. Add plugin to PluginRegistry with data requirements
3. Update App.tsx to render lens controls + detail panel
4. Test with excalidraw dataset:
   - Verify health scores render correctly
   - Test cell selection → detail panel flow
   - Validate dimming behavior
   - Check performance with 2,739 files

**Success Criteria:**
- ✅ Treemap renders with health-based colors
- ✅ Clicking cell opens detail panel with metrics
- ✅ Other cells dim to 10% opacity when one selected
- ✅ Lens mode toggle visible (only Debt functional)
- ✅ Size metric selector changes cell sizes
- ✅ No performance lag (<100ms interactions)

---

## 📦 Phase 2: Coupling Lens & Relationship Visualization (2-3 days)

**Goal:** Add coupling network visualization with arc rendering

**Deliverable:** Functional Coupling Lens with relationship arcs and strength-based filtering

### 2.1 Coupling Data Integration (Day 5, Morning)

**File:** `src/services/data/CouplingDataProcessor.ts`

```typescript
interface CouplingEdge {
  source: string;
  target: string;
  cochange_count: number;
  coupling_strength: number;
}

interface EnrichedFileWithCoupling extends EnrichedFileData {
  couplings: Array<{
    target: string;
    strength: number;
    cochangeCount: number;
  }>;
  maxCouplingStrength: number;
}

export class CouplingDataProcessor {
  static enrichFilesWithCoupling(
    files: EnrichedFileData[],
    couplingNetwork: CouplingEdge[]
  ): EnrichedFileWithCoupling[] {
    // Build adjacency map: file -> [{ target, strength }]
    // Add couplings array to each file
    // Calculate maxCouplingStrength per file
  }
  
  static filterByStrength(
    couplings: CouplingEdge[],
    threshold: number
  ): CouplingEdge[] {
    return couplings.filter(c => c.coupling_strength >= threshold);
  }
}
```

**Load Pattern:**
```typescript
// In TreemapExplorerPlugin.processData()
if (lensMode === 'coupling' && couplingData) {
  enrichedFiles = CouplingDataProcessor.enrichFilesWithCoupling(
    enrichedFiles,
    couplingData.edges
  );
}
```

---

### 2.2 Coupling Arc Renderer (Day 5, Afternoon + Day 6, Morning)

**File:** `src/plugins/treemap-explorer/renderers/CouplingArcRenderer.ts`

```typescript
export class CouplingArcRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private arcGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  
  constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    this.svg = svg;
    this.arcGroup = svg.append('g').attr('class', 'coupling-arcs');
  }
  
  render(
    selectedFile: string,
    files: EnrichedFileWithCoupling[],
    leaves: d3.HierarchyRectangularNode<EnrichedFileData>[],
    threshold: number
  ): void {
    // Clear existing arcs
    this.arcGroup.selectAll('*').remove();
    
    // Find selected file data
    const sourceFile = files.find(f => f.key === selectedFile);
    if (!sourceFile) return;
    
    // Filter couplings by threshold
    const visibleCouplings = sourceFile.couplings
      .filter(c => c.strength >= threshold)
      .slice(0, 10); // Limit to top 10
    
    // Draw arcs
    visibleCouplings.forEach(coupling => {
      const sourceLeaf = leaves.find(l => l.data.key === selectedFile);
      const targetLeaf = leaves.find(l => l.data.key === coupling.target);
      
      if (!sourceLeaf || !targetLeaf) return;
      
      // Calculate arc path (quadratic Bezier curve)
      const sx = (sourceLeaf.x0 + sourceLeaf.x1) / 2;
      const sy = (sourceLeaf.y0 + sourceLeaf.y1) / 2;
      const tx = (targetLeaf.x0 + targetLeaf.x1) / 2;
      const ty = (targetLeaf.y0 + targetLeaf.y1) / 2;
      
      const cx = (sx + tx) / 2;
      const cy = Math.min(sy, ty) - 50; // Control point above
      
      this.arcGroup.append('path')
        .attr('class', 'coupling-line')
        .attr('d', `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`)
        .attr('stroke', 'rgba(255, 255, 255, 0.6)')
        .attr('stroke-width', coupling.strength * 3)
        .attr('fill', 'none')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .transition()
        .duration(300)
        .style('opacity', 1);
    });
  }
  
  clear(): void {
    this.arcGroup.selectAll('*').remove();
  }
}
```

**Performance Notes:**
- **Limit to 10 arcs** per selected file (story: "8 other files")
- Only render when file selected (not on hover)
- Use SVG paths first, monitor performance
- If >2,739 files lag, switch to Canvas (fallback)

**Reference:** Mockup lines 632-659 for arc drawing logic

---

### 2.3 Coupling Lens Color Scheme (Day 6, Morning)

**File:** `src/plugins/treemap-explorer/utils/colorScales.ts`

```typescript
export const getCouplingColor = (
  file: EnrichedFileWithCoupling,
  selectedFile: string | null,
  threshold: number
): string => {
  // Selected file = white highlight
  if (selectedFile && file.key === selectedFile) {
    return '#ffffff';
  }
  
  // Files with strong couplings (above threshold) = purple gradient
  if (file.maxCouplingStrength >= threshold) {
    const intensity = file.maxCouplingStrength;
    return `hsl(270, 70%, ${30 + intensity * 40}%)`;
  }
  
  // Other files = dark gray (subdued)
  return '#27272a';
};
```

**Visual Effect:** As user raises threshold slider (0.3 → 0.6 → 0.9):
- More cells fade to gray
- Only tightly coupled clusters remain purple
- Reveals architectural "cores"

**Reference:** Mockup lines 560-566 for exact HSL values

---

### 2.4 Coupling Detail Panel View (Day 6, Afternoon)

**File:** `src/plugins/treemap-explorer/components/CouplingView.tsx`

```typescript
const CouplingView: React.FC<{ file: EnrichedFileWithCoupling }> = ({ file }) => {
  const topPartners = file.couplings
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8);
  
  return (
    <>
      {/* Coupling Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-950/30 border border-purple-900/50">
        <span className="text-xs text-zinc-400">Coupling Partners</span>
        <span className="text-2xl font-bold">{file.couplings.length}</span>
      </div>
      
      {/* Max Strength */}
      <div className="mt-3 p-3 bg-zinc-950 rounded-lg">
        <span className="text-xs text-zinc-500">Max Coupling Strength</span>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500"
              style={{ width: `${file.maxCouplingStrength * 100}%` }}
            />
          </div>
          <span className="text-sm font-mono">{file.maxCouplingStrength.toFixed(2)}</span>
        </div>
      </div>
      
      {/* Top Coupling Partners List */}
      <div className="mt-4">
        <h4 className="text-xs text-zinc-500 mb-2">Top Coupling Partners</h4>
        <div className="space-y-1.5">
          {topPartners.map((partner, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-zinc-950 rounded text-xs">
              <span className="font-mono text-zinc-300 flex-1 truncate">
                {partner.target.split('/').pop()}
              </span>
              <span className="text-purple-400 font-medium ml-2">
                {partner.strength.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Insight */}
      <div className="mt-4 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex items-start gap-2">
          <GitBranch className="w-4 h-4 text-purple-400 mt-0.5" />
          <p className="text-xs text-zinc-300 leading-relaxed">
            {topPartners.length} strong coupling relationships detected. 
            Changes here may ripple to {topPartners.length} other files. 
            Consider decoupling before major refactoring.
          </p>
        </div>
      </div>
    </>
  );
};
```

**Reference:** Mockup lines 296-358 for exact styling

---

### 2.5 Coupling Filter Controls (Day 7, Morning)

**File:** `src/plugins/treemap-explorer/components/CouplingFilterPanel.tsx`

```typescript
const CouplingFilterPanel: React.FC<{ state: TreemapExplorerState, onChange: (updates: Partial<TreemapExplorerState>) => void }> = ({ state, onChange }) => {
  return (
    <>
      <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3 block">
        Coupling Controls
      </label>
      
      {/* Strength Threshold Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Min Strength</span>
          <span className="text-xs text-purple-400 font-mono">
            {state.couplingThreshold.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={state.couplingThreshold}
          onChange={(e) => onChange({ couplingThreshold: parseFloat(e.target.value) })}
          className="w-full accent-purple-500"
        />
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Filter files by minimum coupling strength. Higher values show only tightly coupled files.
        </p>
      </div>
      
      {/* Show Arcs Toggle */}
      <div className="flex items-center justify-between mt-4 p-2 bg-zinc-950 rounded">
        <span className="text-xs text-zinc-400">Show Coupling Arcs</span>
        <input
          type="checkbox"
          checked={state.showArcs}
          onChange={(e) => onChange({ showArcs: e.target.checked })}
          className="accent-purple-500"
        />
      </div>
    </>
  );
};
```

**Integration:** Render in FilterPanel when `lensMode === 'coupling'`

**Reference:** Mockup lines 179-198 for slider styling

---

### 2.6 Testing & Refinement (Day 7, Afternoon)

**Test Cases:**
1. Select file → arcs appear to top 8-10 partners
2. Adjust threshold slider → cells fade/highlight dynamically
3. Toggle "Show Arcs" → arcs disappear/reappear
4. Switch to Debt lens → arcs clear, colors change
5. Performance: 115,824 edges in dataset, but only 10 rendered at once

**Success Criteria:**
- ✅ Coupling lens color scheme (purple gradient)
- ✅ Arcs render correctly with curved paths
- ✅ Arc thickness correlates with strength
- ✅ Detail panel shows top partners list
- ✅ Threshold slider filters visualization in real-time
- ✅ No performance degradation

---

## 📦 Phase 3: Temporal Lens & Timeline Controls (3-4 days)

**Goal:** Add time-travel capability with timeline scrubber

**Deliverable:** Functional Time Lens with temporal filtering and lifecycle visualization

### 3.1 Temporal Data Integration (Day 8, Morning)

**Challenge:** `temporal_daily.json` is day-level, not file-level

**Solution Options:**
1. **Pre-aggregate in data pipeline** (recommended if possible)
2. **Client-side join** using `file_lifecycle.json` (if accessible)
3. **Proxy metrics** using `file_index.json` dates (fallback)

**File:** `src/services/data/TemporalDataProcessor.ts`

```typescript
interface FileLifecycleEvent {
  file: string;
  date: string;
  operation: 'A' | 'M' | 'D' | 'R';
  commit: string;
}

interface TemporalFileData extends EnrichedFileData {
  createdDate: string;
  lastModifiedDate: string;
  dormantDays: number;
  activityTimeline: Array<{ date: string; commits: number }>;
  isDormant: boolean;
}

export class TemporalDataProcessor {
  static enrichFilesWithTemporal(
    files: EnrichedFileData[],
    temporalDaily: TemporalDailyData,
    currentPosition: number // 0-100 slider value
  ): TemporalFileData[] {
    // Map currentPosition (0-100) to date range (first commit → last commit)
    // Mark files created after currentPosition as "future" (hide/fade)
    // Mark files not modified recently as "dormant"
    // Build activity timeline per file
  }
}
```

**Fallback Implementation:** If file-level temporal data unavailable:
```typescript
// Use file_index.json dates only
isDormant = (today - lastModifiedDate) > 180 days
activityTimeline = null // Skip sparkline
```

---

### 3.2 Timeline Scrubber Component (Day 8, Afternoon + Day 9, Morning)

**File:** `src/plugins/treemap-explorer/components/TimelineScrubber.tsx`

```typescript
interface TimelineScrubberProps {
  minDate: string; // "2020-01-02"
  maxDate: string; // "2024-01-15"
  currentPosition: number; // 0-100
  visible: boolean;
  onPositionChange: (position: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  minDate,
  maxDate,
  currentPosition,
  visible,
  onPositionChange
}) => {
  const currentCommit = Math.floor(currentPosition * 51.37); // Map to 5,137 total commits
  
  return (
    <div 
      className={cn(
        "absolute bottom-0 left-0 w-full h-16 flex items-center px-8 transition-opacity",
        "bg-gradient-to-t from-zinc-900 to-transparent",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <span className="text-xs text-zinc-500 font-mono">{minDate}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={currentPosition}
        onChange={(e) => onPositionChange(parseFloat(e.target.value))}
        className="flex-1 mx-4 accent-purple-500 h-2"
      />
      <span className="text-xs text-zinc-500 font-mono">{maxDate}</span>
      <span className="text-xs text-zinc-400 ml-4">
        Commit: {currentCommit}/5137
      </span>
    </div>
  );
};
```

**Visibility Logic:**
- Appears on hover over treemap area (mockup line 139)
- Only when `lensMode === 'time'`
- Fades in/out with CSS transition (300ms)

**Reference:** Mockup lines 143-153 for exact structure

---

### 3.3 Time Lens Color Scheme (Day 9, Afternoon)

**File:** `src/plugins/treemap-explorer/utils/colorScales.ts`

```typescript
export const getTimeColor = (
  file: TemporalFileData,
  timePosition: number,
  filters: { showCreations: boolean; fadeDormant: boolean }
): string => {
  // Fade dormant files
  if (file.isDormant && filters.fadeDormant) {
    return '#1a1a1d'; // Very dark gray
  }
  
  // Highlight recent creations (early in timeline)
  if (timePosition < 30 && filters.showCreations) {
    return '#22c55e'; // Bright green
  }
  
  // Show dormant status at end of timeline
  if (timePosition > 70 && file.isDormant) {
    return '#3f3f46'; // Medium gray
  }
  
  // Default: blue (active files)
  return '#3b82f6';
};
```

**Visual Narrative:** As user scrubs timeline:
- **Position 0-30%** (2020-2021): Bright green cells = newly created files
- **Position 30-70%** (2021-2023): Blue cells = active development
- **Position 70-100%** (2023-2025): Gray cells = dormant files, green = still active

**Reference:** Mockup lines 568-576

---

### 3.4 Time Detail Panel View (Day 10, Morning)

**File:** `src/plugins/treemap-explorer/components/TimeView.tsx`

```typescript
const TimeView: React.FC<{ file: TemporalFileData }> = ({ file }) => {
  return (
    <>
      {/* Lifecycle Status Badge */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        file.isDormant 
          ? "bg-zinc-950/50 border-zinc-800"
          : "bg-blue-950/50 border-blue-900/50"
      )}>
        <span className="text-xs text-zinc-400">Status</span>
        <span className="text-sm font-bold">
          {file.isDormant ? '🔒 Dormant' : '⚡ Active'}
        </span>
      </div>
      
      {/* Key Dates */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <MetricCard label="Created" value={formatDate(file.createdDate)} />
        <MetricCard label="Last Modified" value={formatDate(file.lastModifiedDate)} />
        <MetricCard label="Age" value={`${file.ageDays} days`} />
        <MetricCard label="Dormant" value={`${file.dormantDays} days`} />
      </div>
      
      {/* Activity Timeline (if available) */}
      {file.activityTimeline && (
        <div className="mt-4">
          <h4 className="text-xs text-zinc-500 mb-2">Commit Activity</h4>
          <TimelineSparkline data={file.activityTimeline} />
        </div>
      )}
      
      {/* Lifecycle Insight */}
      <div className="mt-4 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-blue-400 mt-0.5" />
          <p className="text-xs text-zinc-300 leading-relaxed">
            {file.isDormant 
              ? `This file has been dormant for ${file.dormantDays} days. May be stable/complete, or candidate for deprecation review.`
              : `Active file with recent modifications. Part of current development focus area.`
            }
          </p>
        </div>
      </div>
    </>
  );
};
```

**TimelineSparkline Component:** (D3 micro-visualization)
```typescript
const TimelineSparkline: React.FC<{ data: Array<{ date: string; commits: number }> }> = ({ data }) => {
  useEffect(() => {
    // D3 area chart: date on X, commits on Y
    // Show activity peaks/valleys
    // Reference story: "rapid rise, sustained plateau, then abrupt drop-off"
  }, [data]);
  
  return <svg className="w-full h-16" />;
};
```

**Reference:** Mockup lines 359-423 for layout

---

### 3.5 Time Filter Controls (Day 10, Afternoon)

**File:** `src/plugins/treemap-explorer/components/TimeFilterPanel.tsx`

```typescript
const TimeFilterPanel: React.FC<{ state: TreemapExplorerState, onChange: (updates: Partial<TreemapExplorerState>) => void }> = ({ state, onChange }) => {
  return (
    <>
      <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3 block">
        Temporal Filters
      </label>
      
      {/* Show Recent Creations */}
      <div className="flex items-center justify-between p-2 bg-zinc-950 rounded">
        <div>
          <span className="text-xs text-zinc-300">Highlight New Files</span>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            Show recently created files in green
          </p>
        </div>
        <input
          type="checkbox"
          checked={state.filters.showCreations}
          onChange={(e) => onChange({ 
            filters: { ...state.filters, showCreations: e.target.checked }
          })}
          className="accent-blue-500"
        />
      </div>
      
      {/* Fade Dormant Files */}
      <div className="flex items-center justify-between p-2 bg-zinc-950 rounded mt-2">
        <div>
          <span className="text-xs text-zinc-300">Fade Dormant Files</span>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            Dim files with no recent activity
          </p>
        </div>
        <input
          type="checkbox"
          checked={state.filters.fadeDormant}
          onChange={(e) => onChange({ 
            filters: { ...state.filters, fadeDormant: e.target.checked }
          })}
          className="accent-blue-500"
        />
      </div>
    </>
  );
};
```

**Reference:** Mockup lines 202-221

---

### 3.6 Integration & Testing (Day 11)

**Tasks:**
1. Wire timeline scrubber to plugin state
2. Implement hover show/hide logic for scrubber
3. Test temporal color transitions as slider moves
4. Validate dormancy detection logic
5. Performance test with 1,384 days of data

**Success Criteria:**
- ✅ Timeline scrubber appears on hover (Time lens only)
- ✅ Scrubbing updates treemap colors dynamically
- ✅ Dormant files fade to gray
- ✅ Recent creations highlight in green
- ✅ Detail panel shows lifecycle information
- ✅ Smooth transitions (<16ms frame time)

---

## 📦 Phase 4: Polish, Optimization & Advanced Features (2 days)

**Goal:** Performance tuning, advanced interactions, edge case handling

**Deliverable:** Production-ready Treemap Explorer with full feature set

### 4.1 Cross-Lens State Persistence (Day 12, Morning)

**Challenge:** When switching lenses, maintain:
- Selected file
- Filter active states
- Spatial layout (cells don't jump)

**Implementation:**
```typescript
// In TreemapExplorerPlugin.update()
onLensChange(newLens: string) {
  // Preserve selectedFile across lens changes
  // Recompute colors based on new lens
  // Do NOT recompute treemap layout
  // Use D3 transitions for smooth color changes
  
  this.svg.selectAll('.treemap-cell')
    .transition()
    .duration(300)
    .attr('fill', d => this.getColorForLens(d.data, newLens));
}
```

**Reference:** Story section "Shifting Perspectives: The Coupling Lens"
> "The treemap doesn't reset—instead, it transforms. Colors shift from health-based to relationship-based."

---

### 4.2 Advanced Filter Combinations (Day 12, Afternoon)

**Multi-Filter Logic:**
```typescript
// Debt lens: Critical + Low Bus Factor
filteredFiles = files.filter(f => 
  f.healthScore.score <= 30 && 
  f.uniqueAuthors < 2
);
// Result: "12 files that are both technically fragile and organizationally risky"

// Coupling lens: High Strength + Critical Health
filteredFiles = files.filter(f =>
  f.maxCouplingStrength >= 0.6 &&
  f.healthScore.score <= 30
);
// Result: "Risky files with high ripple potential"
```

**UI:** "Active Filters" badge in header (mockup line 128)
```typescript
<span 
  className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-400 rounded-full"
  style={{ display: activeFilterCount > 0 ? 'block' : 'none' }}
/>
```

---

### 4.3 Performance Optimization (Day 13, Morning)

**Bottlenecks to Address:**

1. **Arc Rendering** (if >10 arcs causes lag)
   ```typescript
   // Fallback to Canvas if SVG lags
   if (visibleCouplings.length > 20) {
     this.renderArcsToCanvas(visibleCouplings);
   } else {
     this.renderArcsToSVG(visibleCouplings);
   }
   ```

2. **Timeline Scrubbing** (throttle updates)
   ```typescript
   const throttledUpdate = throttle((position: number) => {
     updateTreemapColors(position);
   }, 16); // 60fps max
   ```

3. **Treemap Layout** (memoize computations)
   ```typescript
   // Only recompute layout when sizeMetric changes
   // Color changes don't require layout recalc
   ```

**Target:** <100ms for all interactions (story requirement)

---

### 4.4 Sparkline Charts (Day 13, Afternoon)

**File:** `src/plugins/treemap-explorer/components/SparklineChart.tsx`

```typescript
interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 280,
  height = 40,
  color = '#8b5cf6'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const x = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(data) || 1])
      .range([height, 0]);
    
    const line = d3.line<number>()
      .x((d, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);
    
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', line);
    
  }, [data, width, height, color]);
  
  return <svg ref={svgRef} width={width} height={height} />;
};
```

**Use Cases:**
- Debt lens: Complexity drift chart
- Time lens: Activity timeline

---

### 4.5 Accessibility & Keyboard Navigation (Day 14, Morning)

**Enhancements:**
1. Keyboard shortcuts:
   - `D` = Debt lens
   - `C` = Coupling lens
   - `T` = Time lens
   - `Esc` = Close detail panel
   - `F` = Toggle filters

2. ARIA labels:
   ```tsx
   <button 
     aria-label={`Switch to ${lens.label} lens mode`}
     aria-pressed={currentLens === lens.id}
   >
   ```

3. Focus management:
   - When panel opens, focus first interactive element
   - Trap focus within panel (Tab cycles inside)

---

### 4.6 Final Integration Testing (Day 14, Afternoon)

**Full User Journey Test:**
1. Open app → Treemap Explorer selected
2. Default view (Debt lens, Commits metric)
3. Click large green cell → detail panel opens
4. Switch to Coupling lens → colors change, arcs appear
5. Adjust coupling threshold → cells fade dynamically
6. Switch to Time lens → timeline scrubber appears
7. Scrub timeline → colors shift historically
8. Open filters → enable "Critical Only"
9. Reset filters → all cells visible again
10. Change size metric → cell sizes adjust
11. Close detail panel → return to exploration

**Performance Benchmarks:**
- Treemap render time: <200ms for 2,739 files
- Lens switch: <300ms with smooth transitions
- Arc rendering: <100ms for 10 arcs
- Timeline scrub: <50ms per update
- Filter toggle: <100ms

**Browser Testing:**
- Chrome/Edge (primary)
- Firefox
- Safari (macOS)

---

## 🚀 Deployment Checklist

### Code Quality

- [ ] All TypeScript types properly defined (no `any`)
- [ ] Components follow existing patterns (Timeline Heatmap)
- [ ] Tests written for HealthScoreCalculator
- [ ] Tests written for data processors
- [ ] ESLint passing with no warnings
- [ ] Console errors cleared

### Documentation

- [ ] Update README with Treemap Explorer features
- [ ] Add dataset requirements to docs
- [ ] Document lens mode switching behavior
- [ ] Add screenshots to README

### Dataset Validation

- [ ] Verify `file_index.json` loads correctly
- [ ] Verify `cochange_network.json` loads (optional)
- [ ] Verify `temporal_daily.json` loads (optional)
- [ ] Handle missing datasets gracefully

### Performance

- [ ] Treemap renders <200ms for 2,739 files
- [ ] Lens switching <300ms
- [ ] No memory leaks on repeated interactions
- [ ] Timeline scrubbing smooth (60fps)

---

## 📋 Quick Reference: Component Hierarchy

```
App.tsx
├── Header
│   ├── PluginSelector (global)
│   ├── LensModeSelector (treemap-specific)
│   ├── SizeMetricSelector
│   └── FilterToggle
├── Main (Treemap Area)
│   ├── TreemapVisualization (SVG)
│   │   ├── Cells (rects)
│   │   ├── Labels (text)
│   │   └── CouplingArcs (paths)
│   └── TimelineScrubber (conditional)
└── Sidebar (conditional)
    ├── TreemapDetailPanel
    │   ├── DebtView
    │   ├── CouplingView
    │   └── TimeView
    └── FilterPanel
        ├── DebtFilters
        ├── CouplingFilters
        └── TimeFilters
```

---

## 🎨 Design System Reference (from Mockup)

### Colors

**Background:**
- Primary: `#09090b` (zinc-950)
- Secondary: `#18181b` (zinc-900)
- Tertiary: `#27272a` (zinc-800)

**Accent:**
- Purple: `#8b5cf6` (purple-500)
- Purple Muted: `#6d28d9` (purple-700)

**Health Scale:**
- Healthy: `hsl(145, 60%, 35-50%)` (green)
- Medium: `hsl(45, 70%, 45-60%)` (amber)
- Critical: `hsl(0, 70%, 35-45%)` (red)

**Coupling Scale:**
- Selected: `#ffffff` (white)
- Strong: `hsl(270, 70%, 30-70%)` (purple gradient)
- Weak: `#27272a` (zinc-800)

**Temporal Scale:**
- Active: `#3b82f6` (blue-500)
- New: `#22c55e` (green-500)
- Dormant: `#3f3f46` (zinc-700)
- Very Dormant: `#1a1a1d` (near-black)

### Typography

- Headers: `font-bold text-sm`
- Labels: `text-[10px] uppercase tracking-widest`
- Metrics: `text-2xl font-bold`
- Body: `text-xs text-zinc-300`
- Monospace: `font-mono` for file paths, metrics

### Spacing

- Panel padding: `p-4` (1rem)
- Section gaps: `space-y-6` (1.5rem)
- Metric cards: `gap-2` (0.5rem)
- Border radius: `rounded-lg` (0.5rem)

---

## 🔄 Iteration Strategy

### MVP (Phase 1 + 2)

Ship Debt + Coupling lenses first:
- 90% of user value
- No temporal data complexity
- Can validate plugin architecture

### V2 (Phase 3)

Add Time lens as enhancement:
- Requires dataset work (if file-level temporal missing)
- Less critical for initial launch

### V3 (Future)

Advanced features:
- Playback mode (auto-advance timeline)
- Export selected cluster as JSON
- Compare two repositories side-by-side
- Custom health score formulas (user-configurable)

---

## 📞 Support Contacts

**For Questions on:**
- **Plugin Architecture** → Review `PluginRegistry.test.ts` patterns
- **Data Processing** → Check `DatasetRegistry.ts` for schema expectations
- **UI Components** → Reference Timeline Heatmap components
- **Performance** → Benchmark against existing treemap with 2,739 files

---

## ✅ Success Metrics

**User Experience:**
- 5-minute scan identifies top 10 debt files (Story goal)
- Coupling visualization enables refactoring decisions
- Timeline reveals evolutionary patterns

**Technical:**
- <100ms interaction latency (Story requirement)
- Supports 5,000+ file repositories
- Zero layout jumps when switching lenses

**Code Quality:**
- Follows existing plugin patterns
- Reusable components
- Comprehensive TypeScript typing
- Test coverage >70%

---

**END OF IMPLEMENTATION PLAN**

---

## Appendix A: Dataset Field Mapping

### file_index.json → HealthScoreInputs

```typescript
{
  key: string                    // File identifier
  total_commits: number          // → HealthScoreInputs.totalCommits
  unique_authors: number         // → HealthScoreInputs.uniqueAuthors
  operations: {M, A, D}          // → HealthScoreInputs.operations
  age_days: number               // → HealthScoreInputs.ageDays
  first_seen: string             // → createdDate
  last_modified: string          // → lastModifiedDate
}
```

### cochange_network.json → CouplingData

```typescript
{
  edges: [
    {
      source: string,            // File key
      target: string,            // Partner file key
      coupling_strength: number, // 0-1 (use directly)
      cochange_count: number     // Additional context
    }
  ]
}
```

### temporal_daily.json → TemporalContext

```typescript
{
  days: [
    {
      date: string,              // "2020-01-02"
      commits: number,           // Activity on this day
      files_changed: number,     // Files modified
      unique_authors: number     // Contributors
    }
  ]
}
```

---

## Appendix B: State Management

### Zustand Store Slice

```typescript
// In appStore.ts
interface AppStore {
  // ... existing state
  
  // Plugin-specific state (isolated by plugin ID)
  pluginStates: {
    'treemap-explorer': TreemapExplorerState
  };
  
  setPluginState: (pluginId: string, updates: Partial<TreemapExplorerState>) => void;
  getPluginState: (pluginId: string) => TreemapExplorerState | undefined;
}

// Usage in components:
const state = useAppStore((s) => s.pluginStates['treemap-explorer']);
const setState = useAppStore((s) => s.setPluginState);

// Update lens mode:
setState('treemap-explorer', { lensMode: 'coupling' });
```

---

**This plan provides complete guidance for implementing the Treemap Explorer plugin. Follow phases sequentially, reference the mockup for visual fidelity, and the story for interaction feel. All dataset requirements are validated and architecture decisions are made.**
