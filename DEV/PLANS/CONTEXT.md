# Context: Treemap Visualization Evolution (Phase 3)

## 🎯 Strategic Objective
**Transform the Treemap from a static "File Browser" (1/10) into a multi-dimensional "Ecosystem MRI" (10/10).**

We are moving beyond simple `Size=Lines` / `Color=Type` mappings. The goal is to use the Treemap as a canvas to tell complex stories about **Risk**, **Time**, and **Hidden Dependencies** by leveraging the rich V2 datasets.

## 🧪 Concepts Explored (The "Lenses")
We have prototyped three distinct narrative directions via static mockups. These are not mutually exclusive and might be combined into a single "Lens" selector.

1.  **⚡ The Coupling X-Ray (Structure + Network)**
    *   **Concept:** Hovering a file dims the tree and highlights logically coupled files (via `cochange_network.json`), regardless of their directory location.
    *   **Value:** Reveals "Spaghetti Code" and hidden dependencies that standard hierarchy views conceal.

2.  **⏳ The Evolutionary Timelapse (Time + Growth)**
    *   **Concept:** A scrubbable timeline that replays the repository's history. Files flash Green (Created), Blue (Modified), or fade out (Deleted).
    *   **Value:** Visualizes the *process* of growth, identifying when "God Classes" formed or when major refactors occurred.

3.  **☢️ The Technical Debt Radar (Composite Metrics)**
    *   **Concept:** Uses composite metrics (e.g., `Health Score = Churn × Age + BugFixes`) to highlight "Rot". Includes filtering for "Critical Zones".
    *   **Value:** Acts as a prioritized to-do list for refactoring, ignoring safe legacy code to focus on active risks.

## 📂 Data Assets Available (V2)
We have confirmed access to these datasets in `src/services/data/`:
*   **`file_index.json`**: Rich metadata (primary author, total commits, age, unique authors).
*   **`directory_stats.json`**: Aggregated activity scores for directory nodes.
*   **`cochange_network.json`**: The "hidden" graph edges between files.
*   **`file_lifecycle.json`**: The raw event stream needed for the Timelapse view.

## 🏗️ Architectural State
*   **Plugin System:** We are using the **Phase 2 Control Ownership** pattern. The Treemap plugin will own its own state (`TreemapState`) and render its own UI controls (Lens selector, Timeline scrubber, Filters) via `renderControls`.
*   **Current Code:** `TreemapPlugin.ts` is currently a basic D3 placeholder. It needs a complete rewrite to support these new modes.

## 🚀 Agenda for Next Session
1.  **Review & Refine:** Critically evaluate the three mockups. Decide which features to keep, combine, or discard.
2.  **Unification:** Determine if these should be separate plugins or distinct "Modes/Lenses" within a single Super-Treemap (likely the latter).
3.  **Implementation Strategy:** Plan the D3 update logic to handle switching between these drastically different visual modes without performance penalties.

**Starting Point:** We are at the "Concept Refinement" stage. Do not start coding the final plugin immediately. First, solidify the feature set based on the "Multi-Dimensional" direction.