// src/plugins/treemap-explorer/components/DebtGlossaryModal.tsx

import GlossaryModal, { GlossaryTerm } from "./GlossaryModal";

interface DebtGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedTermId?: string;
}

const DEBT_GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "health-score",
    term: "Health Score",
    shortDescription: "Composite metric indicating overall code health (0-100)",
    fullDescription: `A weighted composite score that evaluates file health based on three key factors:
• Churn Rate (40% weight): How frequently the code is rewritten
• Author Diversity (30% weight): Number of unique contributors
• Age/Dormancy (30% weight): Time since last modification

The score combines these factors to give a holistic view of whether a file is well-maintained, potentially problematic, or requires immediate attention.`,
    formula: `Health Score = (Churn Score × 40%) + (Author Score × 30%) + (Age Score × 30%)

Where each component score ranges from 0-100, calculated using:
- Churn Score: Inverted scoring (lower churn = higher score)
- Author Score: Logarithmic scale with diminishing returns
- Age Score: Penalty-based on dormancy periods`,
    source: "calculated",
    ranges: [
      {
        range: "0-30 (Critical)",
        description:
          "Requires immediate attention. High churn, low contributor diversity, or extended dormancy detected.",
        color: "#dc2626",
      },
      {
        range: "31-60 (Medium)",
        description:
          "Acceptable but could benefit from improvements. Monitor and plan enhancements.",
        color: "#eab308",
      },
      {
        range: "61-100 (Healthy)",
        description:
          "Well-maintained code with good practices. Continue current approach.",
        color: "#16a34a",
      },
    ],
    relatedTerms: ["churn-rate", "author-diversity", "age-penalty"],
  },
  {
    id: "churn-rate",
    term: "Churn Rate",
    shortDescription: "Percentage of commits that modify existing code",
    fullDescription: `Churn rate measures code stability by calculating what proportion of commits involve modifications (M) versus additions (A), deletions (D), or renames (R).

High churn indicates the code is frequently rewritten rather than extended, which can suggest:
• Unclear requirements or design
• Reactive bug-fixing rather than proactive development
• Technical debt accumulation
• Code that's difficult to extend properly

Low churn with mostly additions suggests healthy code evolution.`,
    formula: `Churn Rate = M / (M + A + D + R)

Where:
M = Modification operations (edits to existing file)
A = Addition operations (file creation)
D = Deletion operations (file removal)
R = Rename operations (file moved/renamed)

Result ranges from 0.0 (0%) to 1.0 (100%)`,
    source: "calculated",
    ranges: [
      {
        range: "0-30%",
        description:
          "Healthy - Mostly net-new code, stable evolution (Score: 90-100)",
        color: "#16a34a",
      },
      {
        range: "30-50%",
        description: "Normal - Regular maintenance expected (Score: 70-90)",
        color: "#84cc16",
      },
      {
        range: "50-70%",
        description:
          "High maintenance - Frequent rewrites, monitor closely (Score: 40-70)",
        color: "#eab308",
      },
      {
        range: "70-100%",
        description:
          "Critical instability - Constant rewrites, needs refactoring (Score: 0-40)",
        color: "#dc2626",
      },
    ],
    example: `File with 20 total commits:
- 15 Modifications (M)
- 3 Additions (A)
- 2 Deletions (D)
- 0 Renames (R)

Churn Rate = 15 / (15 + 3 + 2 + 0) = 15/20 = 0.75 = 75%

This is high churn, suggesting instability.`,
    relatedTerms: ["health-score", "operations"],
  },
  {
    id: "bus-factor",
    term: "Bus Factor Status",
    shortDescription:
      "Risk assessment based on contributor concentration (high/medium/low risk)",
    fullDescription: `The "bus factor" is a risk metric asking: "How many team members need to be unavailable (hit by a bus) before the project is in serious trouble?"

A low bus factor (1-2 people) means critical knowledge is concentrated in few individuals. If they leave, the organization loses important context and expertise.

This metric identifies knowledge silos and helps teams plan for:
• Knowledge transfer and documentation
• Pair programming opportunities
• Cross-training needs
• Succession planning`,
    formula: `if unique_authors < 2:  "high-risk"
if unique_authors < 4:  "medium-risk"
if unique_authors >= 4: "low-risk"`,
    source: "calculated",
    ranges: [
      {
        range: "High-Risk (1 author)",
        description:
          "Single contributor creates knowledge silo. If they leave, expertise is lost.",
        color: "#dc2626",
      },
      {
        range: "Medium-Risk (2-3 authors)",
        description:
          "Limited redundancy. Some knowledge transfer exists but still vulnerable.",
        color: "#eab308",
      },
      {
        range: "Low-Risk (4+ authors)",
        description:
          "Healthy distribution. Knowledge is shared across multiple team members.",
        color: "#16a34a",
      },
    ],
    relatedTerms: ["author-diversity", "primary-author"],
  },
  {
    id: "author-diversity",
    term: "Author Diversity Score",
    shortDescription: "Component score based on contributor count (0-100)",
    fullDescription: `Measures the health benefits of having multiple contributors to a file. More authors means:
• Better knowledge distribution
• Lower bus factor risk
• More code review and quality checks
• Different perspectives and approaches

The score uses a logarithmic scale with diminishing returns because going from 1 to 2 authors provides more benefit than going from 10 to 11.`,
    formula: `if authors == 1: score = 30 (high risk)
if authors == 2: score = 60 (moderate risk)
if authors <= 5: score = 60 + ((authors - 2) / 3) × 30  [linear: 60-90]
if authors > 5:  score = min(100, 90 + log10(authors - 4) × 10)  [logarithmic]

This score contributes 30% to the overall Health Score.`,
    source: "calculated",
    ranges: [
      {
        range: "1 author → 30 points",
        description: "High bus factor risk, knowledge silo",
        color: "#dc2626",
      },
      {
        range: "2 authors → 60 points",
        description: "Some redundancy but still risky",
        color: "#eab308",
      },
      {
        range: "3-5 authors → 60-90 points",
        description: "Healthy collaboration, good knowledge distribution",
        color: "#84cc16",
      },
      {
        range: "5+ authors → 90-100 points",
        description: "Very healthy, diminishing returns at higher numbers",
        color: "#16a34a",
      },
    ],
    example: `File A: 1 author → 30 points
File B: 2 authors → 60 points
File C: 5 authors → 90 points
File D: 10 authors → ~95 points (diminishing returns)`,
    relatedTerms: ["health-score", "bus-factor", "primary-author"],
  },
  {
    id: "age-penalty",
    term: "Age Penalty / Dormancy Score",
    shortDescription:
      "Score reduction based on time since last modification (0-100)",
    fullDescription: `Evaluates file health based on maintenance recency. Files that haven't been touched in a long time may be:
✅ Stable and complete (good dormancy)
⚠️ Abandoned or forgotten (bad dormancy)

The system applies graduated penalties:
• 0-180 days: Minimal penalty (active file)
• 180-365 days: 10% penalty (moderately dormant)
• 365+ days: 20% penalty (very dormant)

Context matters: A utility file dormant for 2 years might be perfectly stable, while a core business logic file dormant for 6 months might indicate abandonment.`,
    formula: `if days_since_change == 0:
  score = 100  (recently modified)

if days_since_change <= 180:
  score = 100 - (days / 180) × 10  [gradual: 100→90]

if days_since_change <= 365:
  score = 90 - ((days - 180) / 185) × 10  [10% penalty: 90→80]

if days_since_change > 365:
  excess = days - 365
  score = max(70, 80 - min(excess / 365, 1) × 10)  [20% penalty: 80→70]

This score contributes 30% to the overall Health Score.`,
    source: "calculated",
    ranges: [
      {
        range: "0 days (Active)",
        description: "Recently modified, 100 points",
        color: "#16a34a",
      },
      {
        range: "0-180 days",
        description: "Active maintenance, minimal penalty (90-100 points)",
        color: "#84cc16",
      },
      {
        range: "180-365 days (Dormant)",
        description: "Moderately dormant, 10% penalty (80-90 points)",
        color: "#eab308",
      },
      {
        range: "365+ days (Very Dormant)",
        description: "Long dormancy, 20% penalty (70-80 points)",
        color: "#f97316",
      },
    ],
    relatedTerms: ["health-score"],
  },
  {
    id: "operations",
    term: "Operations (M, A, D, R)",
    shortDescription: "Git operation types tracked from commit history",
    fullDescription: `Git operations categorize how files change over time:

**M (Modification):** Edits to an existing file
- Most common operation for mature files
- High M count relative to others indicates churn

**A (Addition):** File creation
- Every file starts with one Addition
- Additional A operations are unusual (file deleted then recreated)

**D (Deletion):** File removal
- Indicates cleanup, refactoring, or deprecation
- Files with D operations won't appear in active file lists

**R (Rename):** File moved or renamed
- Path changes, contents may or may not change
- Helps track file evolution across renames

These operations feed into churn rate and other metrics.`,
    formula: `Extracted from git log:
M = count of commits where file was modified
A = count of commits where file was added
D = count of commits where file was deleted  
R = count of commits where file was renamed

Total operations = M + A + D + R`,
    source: "provided",
    ranges: [
      {
        range: "High M, Low A/D/R",
        description: "Frequent modifications - potential instability",
        color: "#eab308",
      },
      {
        range: "Balanced operations",
        description: "Normal evolution pattern",
        color: "#16a34a",
      },
      {
        range: "Very High M",
        description: "Constant rewrites - critical churn",
        color: "#dc2626",
      },
    ],
    relatedTerms: ["churn-rate"],
  },
  {
    id: "total-commits",
    term: "Total Commits",
    shortDescription:
      "Number of commits that touched this file (from datasets)",
    fullDescription: `The absolute count of commits that modified this file throughout its history.

Indicates:
• Activity level - how frequently the file changes
• Maintenance burden - more commits = more attention needed
• Complexity proxy - frequently changed files are often complex

Context matters:
• New files naturally have few commits
• Utility files may have many commits but be stable
• Core business logic files expect moderate commit counts`,
    source: "provided",
    example: `File created 2 years ago with 50 commits:
- Average: ~2 commits per month
- Indicates moderate, consistent activity

File created 6 months ago with 50 commits:
- Average: ~8 commits per month
- Indicates high activity or instability`,
    relatedTerms: ["churn-rate", "operations"],
  },
  {
    id: "primary-author",
    term: "Primary Author",
    shortDescription:
      "Author with most commits and their ownership percentage (from datasets)",
    fullDescription: `Identifies the main contributor to a file and what percentage of commits they made.

**Primary Author ID:** Normalized author identifier (consistent across email variations)

**Primary Author Percentage:** Ratio of their commits to total commits

Interpretation:
• >80%: Single dominant owner (high bus factor risk)
• 50-80%: Clear primary maintainer with others contributing
• <50%: Distributed ownership, no single owner

This helps identify:
• Who to ask questions about the code
• Knowledge silos (one person owns everything)
• Collaboration patterns
• Succession planning needs`,
    formula: `primary_author_percentage = 
  (commits_by_primary_author / total_commits)

Expressed as decimal: 0.67 = 67%`,
    source: "provided",
    example: `File with 30 total commits:
- Alice: 20 commits (67%)
- Bob: 7 commits (23%)  
- Carol: 3 commits (10%)

Primary Author: Alice (67%)

This indicates Alice has clear ownership but others have contributed.`,
    relatedTerms: ["bus-factor", "author-diversity"],
  },
  {
    id: "lines-changed",
    term: "Lines Added / Deleted / Net Change",
    shortDescription: "Cumulative line changes from git diffs (from datasets)",
    fullDescription: `Tracks the volume of code changes over a file's lifetime:

**Lines Added:** Cumulative sum of all lines added across commits
**Lines Deleted:** Cumulative sum of all lines removed across commits
**Net Change:** lines_added - lines_deleted (estimated current size)

These metrics help identify:
• File size and complexity (high net change = large file)
• Churn patterns (high add + delete with low net = thrashing)
• Growth trajectory (steadily increasing net change)
• Refactoring efforts (big deletions)

Note: Net change is an estimate. Actual file size may differ due to content changes that maintain line count.`,
    source: "provided",
    example: `File metrics:
- Lines Added: 1,200
- Lines Deleted: 800
- Net Change: +400

Interpretation:
- Current estimated size: ~400 lines
- High add+delete suggests significant evolution
- Net positive indicates file is growing

Compare to:
- Lines Added: 1,200
- Lines Deleted: 1,150
- Net Change: +50

This shows massive churn (lots of rewriting) despite small final size.`,
    relatedTerms: ["churn-rate", "total-commits"],
  },
];

export default function DebtGlossaryModal({
  isOpen,
  onClose,
  highlightedTermId,
}: DebtGlossaryModalProps) {
  return (
    <GlossaryModal
      isOpen={isOpen}
      onClose={onClose}
      title="Technical Debt Lens - Glossary"
      terms={DEBT_GLOSSARY_TERMS}
      highlightedTermId={highlightedTermId}
    />
  );
}
