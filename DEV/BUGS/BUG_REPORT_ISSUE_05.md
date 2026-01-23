## ISSUE_01: Lens Selection Buttons Lack State Differentiation

**View/Component:** Treemap Explorer / Lens selector (DEBT, COUP, TIME)
**Issue Type:** UI / UX

**Observed Symptoms:**

* The DEBT, COUP, and TIME buttons all render with the same outlined, low-contrast appearance.
* No visual change occurs when switching between lenses.
* There is no visual indication of which lens is currently active.
* Buttons visually resemble a disabled or inactive state even while the treemap updates.

**User Impact:**

* Users cannot determine which analytical lens is currently driving the visualization.
* The UI provides no confirmation that an interaction has taken effect.
* This increases cognitive load and creates uncertainty when interpreting the treemap.

**Additional Context:**

* The treemap content changes, implying internal state changes, but the header controls do not reflect this.
* Issue observed in the Treemap Explorer view via user-provided screenshot.

---

## ISSUE_02: Indistinguishable Metrics Between “Commits” and “Events”

**View/Component:** Global Metric Selector
**Issue Type:** UX / Functional

**Observed Symptoms:**

* Switching between “Commits” and “Events” produces no visible change in the visualization.
* Treemap box sizes remain identical when toggling between these two metrics.
* Switching to “Authors” *does* produce a noticeable visual change.

**User Impact:**

* Users cannot infer any semantic or quantitative difference between “Commits” and “Events.”
* The controls appear unresponsive or misleading.
* Users may question the correctness or completeness of the underlying data.

**Additional Context:**

* Observed in Treemap Explorer.
* Behavior reproduced consistently with the Excalidraw dataset.

---

## ISSUE_03: Metrics Presented Without Explanatory Context

**View/Component:** Treemap Explorer (Debt Lens) / Detail Panel
**Issue Type:** UX / Information Discoverability

**Observed Symptoms:**

* Domain-specific metrics (e.g., Technical Debt, Bus Factor, Health Score, Churn) are displayed as raw labels and values.
* No definitions, descriptions, or contextual explanations are visible in the UI.
* Clicking files or switching lenses does not reveal additional explanatory information.

**User Impact:**

* Users unfamiliar with software-archaeology terminology cannot interpret the meaning or significance of values.
* Numerical outputs lack actionable meaning without contextual grounding.
* The visualization favors expert users and excludes newcomers.

**Additional Context:**

* The issue is most pronounced in the DEBT lens and the file Detail Panel.
* Metrics are presented consistently across the UI with no variation in explanatory depth.

---
