# The Story of Git Treemap Explorer

## The Vision

Software repositories are living organisms—they grow, evolve, decay, and regenerate. But unlike biological systems, their internal structure remains invisible to most developers. Directories appear as simple folders, files as inert text containers. The truth is far more complex: every file carries a history of risk, every directory tells a story of collaboration, and every coupling reveals hidden dependencies that can make or break refactoring efforts.

**Git Treemap Explorer** was born from this challenge—to make the invisible architecture of code visible, explorable, and actionable through spatial representation.

## What It Does

This application transforms a git repository (specifically, Excalidraw's 2,739 files across 3,030 directories) into an explorable landscape where space equals significance. Using a treemap layout, it reveals three interconnected dimensions of code health:

- **Space represents activity**: Files are sized by commit count, author count, or total events—immediately showing which parts of the codebase consume the most attention
- **Color reveals risk**: Health scores derived from churn rates, bus factor, and age paint a diverging spectrum from healthy green through cautious yellow to critical red
- **Interaction exposes relationships**: Hover and click interactions unveil coupling networks, temporal evolution, and contributor patterns

## The User Journey

### First Encounter

A senior engineer opens the tool after cloning Excalidraw's repository. The interface loads with a dark, sophisticated aesthetic—a massive treemap fills the screen, each rectangle representing a file, sized by recent activity. The largest blocks immediately draw attention: `src/components/App.tsx`, `src/types.ts`, `package-lock.json`.

The header shows they're viewing **Git Repository Visualization** for the **excalidraw** repository. A dropdown displays **"Treemap Explorer"** with a grid icon—indicating this is one of several available visualization plugins. Next to it, three lens mode buttons (Debt, Coupling, Time) let them switch analytical perspectives without leaving the treemap view.

The color palette tells an immediate story. Most blocks glow in healthy greens and blues, but scattered throughout are amber warnings and occasional red alerts—visual flags that something needs attention.

### Discovery Through Exploration

They hover over a large green block labeled `src/packages/excalidraw`. The cell subtly scales, outlined in white. Instantly, unobtrusive tooltips appear:

- **Health Score: 72** (medium-high)
- **15 authors** contributing
- **Bus Factor: Low Risk**

The information is brief but meaningful—enough to understand the file's state without overwhelming. Moving the cursor reveals more cells, each with its own story. A small red block catches their eye: `src/legacy/oldRenderer.js`.

Hovering triggers a different response—the tooltip warns:
- **Health Score: 23** (critical)
- **Churn: 87%** (excessive rewrites)
- **2 authors** (high bus factor risk)
- **Age: 1,247 days** (potentially abandoned)

This is technical debt made visible.

### Locking Into Detail

Curiosity piqued, they click the red cell. The treemap dims—all other files fade to 10% opacity except for the selected file, which glows white. A detail panel slides smoothly from the right side of the screen, anchoring their focus.

The panel reveals deeper insights:

**File:** `oldRenderer.js`
**Path:** `src/legacy/oldRenderer.js`

**Health Metrics:**
- **Health Score: 23/100** (Critical: requires immediate attention)
- **Churn Rate: 87%** (High instability—frequent rewrites)
- **Active Authors: 2** (Bus Factor: High Risk)
- **Age: 1,247 days** (Last modified: 2021-08-15)

**Complexity Drift:**
A small sparkline chart shows complexity increasing over time—a visual trend line indicating the file has been patched rather than refactored.

**Insight:** "Critical technical debt detected. High churn with low contributor diversity suggests reactive maintenance rather than planned evolution."

### Shifting Perspectives: The Coupling Lens

In the header, they notice the three lens mode buttons next to the plugin selector. Currently, **"Debt"** is highlighted in purple. They click **"Coupling"**. 

The treemap doesn't reset—instead, it transforms. Colors shift from health-based to relationship-based. The red warning cell now appears purple, indicating it's not just risky—it's *entangled*.

Hovering over `oldRenderer.js` triggers a new behavior: thin white lines arc gracefully across the treemap, connecting it to 8 other files. These are its coupling partners—files that change together frequently.

The detail panel updates:

**Top Coupling Partners:**
1. `src/renderer/newRenderer.ts` (Strength: 0.74 - Very High)
2. `src/components/Canvas.tsx` (Strength: 0.58)
3. `src/utils/rendering.ts` (Strength: 0.45)

**Insight:** "8 strong coupling relationships detected. Changes here may ripple to 8 other files. Consider decoupling before major refactoring."

A filter panel on the right offers a strength threshold slider. Moving it from 0.3 to 0.6 filters the visualization—only high-strength connections remain visible. The treemap now reveals the true architectural core: clusters of tightly coupled files that form the system's backbone.

### Time Travel: The Evolutionary Lens

Switching to the **"Time"** lens shifts the experience again. The treemap remains spatially consistent, but now each cell carries temporal cues:

- **Bright green borders**: Files created in the last 10 commits
- **Faint gray cells**: Files dormant for 100+ commits
- **Blue flashes**: Recent modifications

At the bottom of the screen, a timeline scrubber appears on hover—a subtle axis spanning the repository's 1,384-day history. They drag the handle backward.

As they scrub through time, cells fade in and out. At commit 500 (mid-2021), `oldRenderer.js` is bright and large—it was the rendering engine. By commit 2,000, `newRenderer.ts` has appeared and grown, while the old file begins to shrink and fade.

Clicking a cell in timelapse mode opens a different detail panel:

**File Lifecycle: `oldRenderer.js`**
- **Created:** 2020-03-12 (Commit 156)
- **Peak Activity:** 2021-07 (87 commits in that month)
- **Decline Begins:** 2022-01 (new renderer introduced)
- **Last Modified:** 2021-08-15
- **Status:** Dormant (no changes in 1,247 days)

A timeline sparkline shows commit frequency over the file's life—a rapid rise, sustained plateau, then abrupt drop-off. This is the lifecycle of replaced infrastructure made tangible.

**Insight:** "This file has been dormant for extended period. May be stable/complete, or candidate for deprecation review."

### Filtering for Focus

Back in **Debt** lens mode, they notice a filter toggle in the header. Clicking it opens a side panel from the right:

**Filters:**
- ☑ **Critical Only** (Health Score ≤ 30)
- ☐ **Low Bus Factor** (<2 authors)
- ☐ **High Churn** (>70%)

Enabling "Critical Only" dims 90% of the treemap. Only a handful of red cells remain fully visible—these are the files demanding immediate attention. Enabling "Low Bus Factor" overlays cells with <2 contributors—revealing knowledge silos that create organizational risk.

The combination of filters tells a focused story: "Here are the 12 files that are both technically fragile and organizationally risky." This is actionable insight, not just data.

### The Aggregate View

Scrolling reveals that the treemap isn't flat—it's hierarchical. Top-level rectangles represent directories, subdivided into files. The filter panel shows a "Top Directories" section with aggregate metrics:

**src/packages/excalidraw**
- **45 files**
- **892 total commits**
- **8 unique authors**
- **Average Health: 68** (Medium)
- **Activity Score: 19.82** (High)

Clicking the directory would lock it, and the detail panel would shift to directory-level insights showing recent velocity, top contributors, and the directory risk profile.

### The Insight

After 20 minutes of exploration, patterns emerge that would be impossible to see in raw git logs:

1. **Technical Debt Clusters**: Red zones concentrate in `src/legacy/` and parts of `excalidraw-app/`—marking candidates for refactoring sprints.

2. **Architectural Cores**: Coupling view reveals that `src/types.ts`, `src/components/App.tsx`, and `src/element/` form a tightly coupled triad—any change here ripples widely. This isn't bad, but it's critical to know.

3. **Abandoned Infrastructure**: Evolutionary timelapse shows ghost files—created early, briefly active, then dormant. These are refactoring opportunities (delete safely) or forgotten features (revive or document).

4. **Team Knowledge Distribution**: Low bus factor files cluster around specific authors. If dwelle leaves the project, 23 critical files lack backup expertise.

5. **Growth Patterns**: The timeline reveals development waves—intense activity during feature releases (v0.12, v0.15) followed by stabilization. The current period (Jan 2025) shows sustained but measured work—a sign of maturity.

### The Interactive Experience

Every interaction feels intentional:

- **Sticky spatial layout**: Cells stay positioned as you switch lenses, building spatial memory—you learn where risky files "live"
- **Layered information**: Base colors, hover tooltips, click panels—information disclosed progressively, never overwhelming
- **Discoverable timeline**: Scrubber appears on hover, inviting interaction without cluttering the interface
- **Cross-lens consistency**: Filters and selections persist across lens changes, allowing multi-dimensional analysis
- **Performance**: Despite 2,739 files, interactions are instant—logarithmic scaling and efficient rendering handle large repos gracefully

### Resetting and Refocusing

At the bottom of the filter panel, a "Reset All Filters" button lets them start fresh. One click clears all overlays, restoring the default view. It's a clean slate for new explorations.

### Switching Visualizations

When they want a different analytical perspective, they click the plugin dropdown in the header. A menu appears showing:

- **Timeline Heatmap** - View activity across time and directories
- **Treemap Explorer** (currently active) - Spatial code health analysis
- *More plugins coming soon...*

Clicking "Timeline Heatmap" smoothly transitions to the other visualization, maintaining the same repository context. The plugin architecture hints at a growing ecosystem of analytical tools, each revealing different facets of the codebase.

## The Impact

For **tech leads**, this tool becomes a heat-seeking missile for technical debt. A 5-minute scan identifies the top 10 files consuming disproportionate maintenance effort, backed by data.

For **architects**, coupling visualization exposes hidden dependencies before refactoring. They can simulate impacts: "If we split this file, which 15 others will break?"

For **open source maintainers**, the evolutionary view shows contribution patterns—which files attract drive-by contributors vs. sustained ownership. This guides onboarding documentation and mentorship efforts.

For **security auditors**, low bus factor + high criticality = risk. The tool maps organizational vulnerabilities as clearly as technical ones.

## The Design Philosophy

Every pixel serves understanding:

- **Space as the primary dimension**: Treemaps leverage human spatial cognition—we naturally compare sizes and notice outliers
- **Color as semantic layer**: Health, coupling, time—each lens uses color intentionally, never decoratively
- **Interaction rewards curiosity**: Hovering reveals previews; clicking locks detail; filters refine focus. Each action deepens insight without forcing a path
- **Dark theme for extended analysis**: Reduces eye strain during hour-long exploration sessions; makes colored cells pop dramatically
- **Minimal chrome, maximal data**: No unnecessary borders, icons, or decorations—the treemap *is* the interface

## The Technical Foundation

Built on the git-viz V2 dataset architecture:

- **file_index.json** provides file-level metadata (commits, authors, age)
- **cochange_network.json** powers coupling analysis (115,824 edges reveal dependencies)
- **temporal_daily.json** enables time-travel (1,384 days of activity)
- **directory_stats.json** aggregates metrics at folder level (3,030 directories)
- **author_network.json** maps contributor relationships (374 authors)

The treemap uses D3.js for performant hierarchical layouts, with logarithmic scaling to handle outliers (files with 1 commit vs. 822 commits). Interaction states (hover, click, filter) are managed without recomputing layouts—ensuring sub-100ms responsiveness.

## The Future

This is one explorer in a growing toolkit. The plugin selector at the top provides access to companion visualizations:

- **Timeline Heatmap** (already live): Shows activity across time × directories in a 2D grid
- **Treemap Explorer** (current): Spatial code health and coupling analysis
- **Dependency Graph** (coming): Network view of file-to-file imports and inheritance
- **Author Flows** (coming): Sankey diagrams showing how contributions move between directories over releases
- **Complexity Trends** (coming): Time-series charts tracking cyclomatic complexity evolution

The vision: Every codebase deserves a visual archaeology—a way to see not just what code *is*, but what it *was* and what it's *becoming*. Git Treemap Explorer makes that story explorable, one cell at a time.

---

**The treemap doesn't just show structure—it reveals the invisible architecture of risk, relationships, and time that determines whether code thrives or decays.**