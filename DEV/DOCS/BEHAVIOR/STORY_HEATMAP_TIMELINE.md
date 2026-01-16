# The Story of Git Timeline Heatmap

## The Vision

In the world of software development, understanding how a codebase evolves over time is crucial but often overwhelming. Git repositories contain thousands of commits spanning months or years, making it nearly impossible to spot patterns, identify bottlenecks, or understand which parts of the code are most actively developed.

**Git Timeline Heatmap** was born from this challenge—to transform the raw chaos of git history into a beautiful, intuitive visual story.

## What It Does

This application analyzes a git repository (in this case, Excalidraw's codebase) and creates a stunning two-dimensional heatmap that reveals the invisible patterns of development activity:

- **The X-axis represents time**: weeks, months, or quarters stretching across the project's history
- **The Y-axis shows directories**: the top 20 most active folders in the repository
- **Each cell is a window into activity**: colored by intensity, showing commits, events, or contributor counts

## The User Journey

### Opening the App

A developer opens the tool after cloning a repository. The dark, polished interface immediately draws them in—no clutter, just the data that matters. The header shows they're viewing the **Excalidraw** repository with the **Timeline Heatmap** view active.

### Exploring Patterns

The heatmap springs to life with vibrant greens, blues, and oranges. They notice:

- **Hot zones of activity**: `src/packages/excalidraw` glows bright green in recent weeks—clearly the heart of current development
- **Quiet periods**: gaps in the timeline where activity drops, perhaps during holidays or feature freezes
- **Creation and deletion markers**: thin green and red borders on cells hint at files being born or removed

Each cell reveals its value on hover, scaling slightly to confirm focus. The interaction feels immediate and responsive.

### Changing Perspective

The developer switches from "Events" to "Authors" using the sleek metric selector in the header. The heatmap transforms instantly—now showing collaboration intensity. Cells that were previously green shift to warm oranges, revealing that `src/element` had 5 contributors working simultaneously in Week 18.

They toggle the time granularity from "Week" to "Month"—the view condenses, showing macro-level trends across the entire year. The transition is smooth, reframing the story from tactical to strategic.

### Filtering the Noise

Clicking the filter icon opens a side panel that glides in from the right. They notice **file type chips** showing `.tsx` (615 files) and `.ts` (712 files) are already selected, with purple highlights indicating active filters. A small notification dot on the filter button confirms filters are applied.

Deselecting `.json` files removes configuration noise from the heatmap, revealing only meaningful code changes.

The author list shows **dwelle** leads with 1,420 commits, followed by **lipis** and **pomber**. A search bar at the top makes it easy to find specific contributors in larger teams. They could filter to see just one developer's impact across the timeline.

### Diving Deep

Curiosity piqued, they click a particularly bright cell in `src/renderer` during Week 22. The filter panel smoothly transitions out as a detail panel slides in from the right, showing focused analytics:

- **47 events** displayed in large, bold numbers
- **3 authors** collaborated during this period
- A horizontal composition bar breaks down the work: 60% modifications (blue), 30% new files (green), 10% deletions (red)
- Top contributors are listed: **dwelle**, **lipis**, **pomber**

This cell tells a story—a major refactoring happened here, with multiple developers working in parallel. The panel header shows the directory name prominently, with the full path below in smaller text for context.

### The Insight

Stepping back to view the full heatmap, patterns emerge that would be impossible to see in raw git logs:

1. **Development waves**: Activity pulses in cycles, likely sprint-based—intense bursts followed by quieter periods
2. **Technical debt zones**: Some directories show sporadic spikes—evidence of reactive fixes rather than planned work
3. **Team dynamics**: When multiple cells in different directories light up simultaneously with high author counts, it reveals coordinated feature work across the codebase
4. **Abandoned code**: Gray streaks show directories that haven't been touched in months
5. **Hotspots**: The renderer and core packages consistently glow, marking them as critical, high-maintenance areas

### The Interactive Experience

The entire experience feels fluid:
- Sticky headers keep context visible as they scroll through dozens of directories
- Color intensity uses logarithmic scaling, ensuring both small changes and massive refactors are visible
- The metric changes (Commits, Events, Authors) shift the color palette—green for events, blue for commits, orange for authors—creating distinct visual modes
- Border indicators show file lifecycle events without cluttering the main view
- The monospaced font for directory names and time labels gives the interface a technical, precise feel

### Resetting and Exploring Again

At the bottom of the filter panel, a "Reset All Filters" button lets them start fresh. The purple accent color throughout the interface (metric selector, active filters, panel headers) creates a cohesive visual language that guides their eye to interactive elements.

## The Impact

For **team leads**, this tool becomes a dashboard for understanding team velocity and identifying overworked modules. A glance shows which parts of the codebase are consuming the most attention.

For **new developers**, it's a map showing where the action is and which files are most critical to understand. Gray areas might be stable, well-tested code; bright areas might need help.

For **open source maintainers**, it visualizes community contribution patterns and helps identify abandoned code that needs attention or could be deprecated.

For **product managers**, it reveals the true cost of features by showing how development activity spreads across the codebase over time.

## The Design Philosophy

Every element serves the data:
- **Dark theme** reduces eye strain during long analysis sessions and makes the colorful heatmap cells pop
- **Minimal chrome** keeps focus on the visualization itself
- **Thoughtful typography** uses size and weight hierarchies to guide attention
- **Smooth transitions** between states make the interface feel alive and responsive
- **Progressive disclosure** shows summary data first, with details available on demand

## The Future

This is just one view in a larger **Git Repository Visualization** platform. The plugin selector at the top hints at more analysis modes waiting to be explored:
- Dependency graphs showing how files connect and depend on each other
- Contributor networks revealing collaboration patterns and team structure
- Code complexity metrics highlighting technical debt accumulation
- File lifecycle views tracking creation, evolution, and deletion patterns

The story of every codebase deserves to be told visually. **Git Timeline Heatmap** makes that story impossible to ignore, transforming abstract version control data into a vivid, explorable landscape of development activity.