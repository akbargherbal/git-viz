// src/plugins/treemap-explorer/components/CouplingGlossaryModal.tsx

import GlossaryModal, { GlossaryTerm } from "./GlossaryModal";

interface CouplingGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedTermId?: string;
}

const COUPLING_GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "coupling-strength",
    term: "Coupling Strength",
    shortDescription:
      "Probability that two files change together (0.0-1.0 or 0-100%)",
    fullDescription: `Measures how tightly two files are coupled based on their co-change history. The strength represents the likelihood that when File A changes, File B also changes (or vice versa).

Coupling reveals hidden architectural dependencies that aren't visible from import statements or explicit references. Files that always change together likely have a logical relationship.

High coupling can indicate:
• Related functionality that should stay together
• Architectural boundaries that need clarification  
• Potential refactoring opportunities
• Impact analysis targets (changes cascade)`,
    formula: `Coupling Strength = cochange_count / min(commits_A, commits_B)

Where:
- cochange_count: Number of commits touching both files
- commits_A: Total commits to File A
- commits_B: Total commits to File B

We use min() to normalize against the less-frequently-changed file.

Example:
File A: 20 commits
File B: 30 commits  
Co-changes: 12 commits

Strength = 12 / min(20, 30) = 12/20 = 0.60 = 60%`,
    source: "calculated",
    ranges: [
      {
        range: "0-30% (Weak)",
        description:
          "Occasional co-changes, likely incidental or indirect relationship",
        color: "#6366f1",
      },
      {
        range: "30-60% (Moderate)",
        description: "Frequent co-changes, files have meaningful relationship",
        color: "#8b5cf6",
      },
      {
        range: "60-80% (Strong)",
        description:
          "Very frequent co-changes, files are tightly coupled architecturally",
        color: "#a855f7",
      },
      {
        range: "80-100% (Very Strong)",
        description:
          "Nearly always change together - consider if they should merge into one file",
        color: "#c026d3",
      },
    ],
    example: `Scenario 1: Test file coupling
main.py: 50 commits
test_main.py: 40 commits
Co-changes: 38 commits
Strength: 38/40 = 95%

This extremely high coupling is expected - tests should track implementation.

Scenario 2: Unexpected coupling  
auth.py: 30 commits
database.py: 40 commits
Co-changes: 25 commits
Strength: 25/30 = 83%

This reveals hidden architectural coupling worth investigating.`,
    relatedTerms: [
      "cochange-count",
      "top-coupling-partners",
      "coupling-threshold",
    ],
  },
  {
    id: "cochange-count",
    term: "Cochange Count",
    shortDescription: "Absolute number of commits modifying both files",
    fullDescription: `The raw count of commits where both files were modified together in the same commit.

Unlike coupling strength (which is normalized), cochange count shows absolute frequency:
• Low count (<5): Rare co-changes, may be coincidental
• Medium count (5-20): Regular pattern, meaningful relationship
• High count (>20): Very frequent co-changes, strong dependency

Cochange count provides context for coupling strength:
• High strength + Low count = Limited data, relationship unclear
• High strength + High count = Confident strong coupling signal
• Low strength + High count = Files both change often but independently`,
    formula: `Cochange Count = number of commits containing both files

Extracted from git log by finding commits where:
  (File A ∈ commit) AND (File B ∈ commit)`,
    source: "provided",
    example: `File A and File B appear together in 15 commits:

Commit abc123: Modified A, B, C
Commit def456: Modified A, B
Commit ghi789: Modified A, B, D
... (12 more)

Cochange Count: 15

If File A has 20 total commits:
Coupling Strength = 15/20 = 75%`,
    relatedTerms: ["coupling-strength"],
  },
  {
    id: "top-coupling-partners",
    term: "Top Coupling Partners",
    shortDescription: "Files with highest coupling strength (top 5-10)",
    fullDescription: `A ranked list of files most frequently changed together with the current file, sorted by coupling strength.

This list helps answer:
• **Impact Analysis:** If I change this file, what else might break?
• **Testing Strategy:** Which files should I test together?
• **Refactoring Decisions:** Should these files merge or split?
• **Code Review:** What related code should reviewers examine?

The partners shown are filtered by your current coupling threshold, so you only see relationships above your significance level.

Visual indicators:
• Rank badge: Shows relative importance (1 = strongest coupling)
• Strength bar: Visual representation of coupling percentage
• Cochange count: Absolute frequency for confidence assessment`,
    formula: `For each file, sort all coupling relationships by strength:

partners = all_couplings
  .filter(strength >= threshold)
  .sort_by(strength, descending)
  .take(10)

Display top 5-10 results with full metadata.`,
    source: "derived",
    example: `For file "src/auth/login.ts", top partners might be:

1. src/auth/session.ts (92%) - 45 co-changes
   → Very strong coupling, likely core auth flow

2. src/database/users.ts (78%) - 32 co-changes  
   → Strong coupling to user data layer

3. tests/auth/login.test.ts (85%) - 28 co-changes
   → Expected test coupling

4. src/ui/LoginForm.tsx (62%) - 25 co-changes
   → UI/logic coupling worth reviewing

5. src/auth/permissions.ts (48%) - 18 co-changes
   → Moderate coupling to authorization`,
    relatedTerms: ["coupling-strength", "coupling-threshold"],
  },
  {
    id: "coupling-threshold",
    term: "Coupling Threshold",
    shortDescription: "Minimum strength filter for displaying relationships",
    fullDescription: `A user-adjustable filter that controls which coupling relationships are displayed. Only file pairs with coupling strength above this threshold appear in the visualization and detail panels.

**Why adjust the threshold?**

**Lower threshold (e.g., 0.1-0.3):**
• Shows more relationships, including weak ones
• Useful for discovering unexpected connections
• Can be noisy with too many low-value relationships

**Higher threshold (e.g., 0.5-0.7):**
• Shows only strong, confident couplings
• Cleaner view focusing on critical relationships
• May hide useful but weaker patterns

**Default (typically 0.3-0.4):**
• Balances signal and noise
• Shows meaningful relationships without overwhelming

The threshold helps you focus on what matters for your current analysis.`,
    source: "derived",
    ranges: [
      {
        range: "0.1-0.3 (Low threshold)",
        description: "Shows weak and strong relationships, comprehensive view",
        color: "#60a5fa",
      },
      {
        range: "0.3-0.5 (Medium threshold)",
        description:
          "Balanced view showing meaningful couplings (recommended default)",
        color: "#8b5cf6",
      },
      {
        range: "0.5-0.7 (High threshold)",
        description: "Shows only strong couplings, focused view",
        color: "#a855f7",
      },
      {
        range: "0.7-1.0 (Very high threshold)",
        description:
          "Shows only very strong couplings, minimal but critical relationships",
        color: "#c026d3",
      },
    ],
    example: `With threshold = 0.3:
• Shows 15 coupling partners
• Includes moderate and strong relationships
• Good for exploration

With threshold = 0.6:
• Shows 5 coupling partners
• Only strong relationships
• Good for focused refactoring work`,
    relatedTerms: ["coupling-strength", "top-coupling-partners"],
  },
  {
    id: "max-strength",
    term: "Max Coupling Strength",
    shortDescription: "Highest coupling value for this file",
    fullDescription: `The strongest coupling relationship this file has with any other file in the codebase.

This single metric quickly indicates:
• **High (>0.7):** File has very tight coupling somewhere
• **Medium (0.4-0.7):** File has moderate dependencies
• **Low (<0.4):** File is relatively independent

Max strength helps prioritize which files need attention during refactoring. Files with high max strength are often:
• Central to architecture (hub files)
• Tightly bound to implementation details
• High-impact change targets
• Candidates for splitting if coupling is too high`,
    formula: `Max Strength = max(coupling_strength for all partners)

Simply the highest value in the coupling_strength array for this file.`,
    source: "derived",
    example: `File X has coupling relationships:
- File A: 0.45
- File B: 0.83  ← Maximum
- File C: 0.32
- File D: 0.67

Max Strength: 0.83

This tells us File X has at least one very strong coupling (to File B).`,
    relatedTerms: ["coupling-strength", "avg-strength"],
  },
  {
    id: "avg-strength",
    term: "Average Coupling Strength",
    shortDescription: "Mean coupling strength across all partners",
    fullDescription: `The average (mean) of all coupling strength values for this file.

While max strength shows the strongest relationship, average strength indicates overall coupling density:

**High average (>0.5):**
• File is generally highly coupled across many relationships
• Changes likely have wide ripple effects
• Complex dependency web

**Medium average (0.3-0.5):**
• Moderate overall coupling
• Some dependencies but manageable

**Low average (<0.3):**
• Generally independent file  
• Few strong dependencies
• Changes likely isolated

Average strength is useful for comparing files' overall coupling "footprint" in the architecture.`,
    formula: `Average Strength = sum(all_coupling_strengths) / count(partners)

For file with N coupling partners:
avg = (strength₁ + strength₂ + ... + strengthₙ) / N`,
    source: "calculated",
    example: `File X has 4 coupling partners:
- File A: 0.45
- File B: 0.83
- File C: 0.32
- File D: 0.67

Average = (0.45 + 0.83 + 0.32 + 0.67) / 4 = 2.27 / 4 = 0.57

This is a high average, suggesting File X is generally well-coupled to its dependencies.`,
    relatedTerms: ["coupling-strength", "max-strength", "strong-couplings"],
  },
  {
    id: "strong-couplings",
    term: "Strong Couplings Count",
    shortDescription: "Number of relationships with strength > 0.5",
    fullDescription: `Count of coupling relationships exceeding a strength of 0.5 (50%).

This metric quickly shows how many "significant" dependencies a file has:

**0 strong couplings:**
• File is relatively independent
• Changes unlikely to ripple broadly

**1-3 strong couplings:**
• Healthy level of integration
• Manageable dependencies

**4-7 strong couplings:**
• High integration level
• Changes need careful testing of coupled files

**8+ strong couplings:**
• Very high coupling density
• May indicate architectural issues
• Potential hub file or god object

Strong couplings represent the relationships you should care most about during refactoring or impact analysis.`,
    formula: `Strong Couplings = count(partners where strength > 0.5)

Simply filters the coupling list:
partners.filter(p => p.strength > 0.5).length`,
    source: "derived",
    example: `File X has 10 coupling partners:
- 3 partners with strength > 0.7 (very strong)
- 2 partners with strength 0.5-0.7 (strong)
- 5 partners with strength < 0.5 (moderate/weak)

Strong Couplings Count: 5 (the 3 + 2 above threshold)

This tells us File X has 5 relationships worth close attention.`,
    relatedTerms: ["coupling-strength", "coupling-threshold"],
  },
  {
    id: "coupled-files-count",
    term: "Total Coupled Files",
    shortDescription: "Total number of files with any detected coupling",
    fullDescription: `The count of all files that have co-changed with this file at least once, regardless of strength.

This is the denominator for all coupling calculations - it shows the full scope of relationships before filtering:

**Low count (<5):**
• File changes in isolation
• Limited integration with codebase
• May be utility or standalone module

**Medium count (5-15):**
• Normal integration level
• Participates in several subsystems

**High count (>15):**
• Highly connected hub file
• Central to architecture
• Changes affect many areas

Note that not all these couplings may be significant - use coupling threshold and strong couplings count to filter for meaningful relationships.`,
    formula: `Coupled Files = count(all partners regardless of strength)

Includes all co-change relationships detected in git history, even if coupling strength is very low (e.g., 0.01).`,
    source: "derived",
    example: `File X appears in commits with 20 different files throughout history:
- 5 files with strength > 0.5 (strong)
- 7 files with strength 0.2-0.5 (moderate)
- 8 files with strength < 0.2 (weak)

Total Coupled Files: 20

But with threshold = 0.3, only 12 would display (5 strong + 7 moderate).`,
    relatedTerms: [
      "coupling-threshold",
      "strong-couplings",
      "top-coupling-partners",
    ],
  },
  {
    id: "coupling-insight",
    term: "Coupling Insight",
    shortDescription:
      "Automated analysis summary with refactoring recommendations",
    fullDescription: `An intelligent summary generated based on the file's coupling metrics, providing:
• Risk assessment for changes
• Refactoring recommendations
• Testing guidance
• Architectural observations

The insight adapts based on:
• Max coupling strength
• Number of coupled files
• Strong coupling count
• Overall coupling density

This helps developers quickly understand the implications of working with this file without manually analyzing all the metrics.`,
    source: "calculated",
    ranges: [
      {
        range: "No Coupling Detected",
        description:
          "File is isolated - may be new, utility code, or rarely changed",
      },
      {
        range: "Low-Moderate Coupling",
        description:
          "Manageable dependencies - changes have limited ripple effects",
      },
      {
        range: "High Coupling",
        description:
          "Multiple strong dependencies - careful testing needed, review coupled files",
      },
      {
        range: "Very High Coupling",
        description:
          "Extensive coupling network - high impact changes, consider architectural review",
      },
    ],
    example: `Examples of generated insights:

"No coupling relationships detected. This file may be isolated or recently added."

"5 coupling relationships detected with moderate strength. This file co-changes with others but has manageable dependencies."

"8 strong coupling relationships detected (strength > 0.5). Changes here may impact coupled files. Review dependencies before major refactoring."

"15 coupling relationships detected with high strength. Changes here will likely ripple to multiple files. Consider careful refactoring and comprehensive testing."`,
    relatedTerms: [
      "coupling-strength",
      "strong-couplings",
      "top-coupling-partners",
    ],
  },
];

export default function CouplingGlossaryModal({
  isOpen,
  onClose,
  highlightedTermId,
}: CouplingGlossaryModalProps) {
  return (
    <GlossaryModal
      isOpen={isOpen}
      onClose={onClose}
      title="Coupling Lens - Glossary"
      terms={COUPLING_GLOSSARY_TERMS}
      highlightedTermId={highlightedTermId}
    />
  );
}
