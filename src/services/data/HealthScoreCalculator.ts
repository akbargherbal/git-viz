// src/services/data/HealthScoreCalculator.ts

/**
 * Health Score Calculator
 *
 * Computes file health metrics based on three factors:
 * - Churn Rate (40%): How often code is rewritten (low is healthy)
 * - Author Diversity (30%): Number of contributors (more is better, with diminishing returns)
 * - Age Penalty (30%): Dormancy periods indicate technical debt
 *
 * Score Range: 0-100
 * - 0-30: Critical (requires immediate attention)
 * - 31-60: Medium (monitor and plan improvements)
 * - 61-100: Healthy (well-maintained)
 */

export interface HealthScoreInputs {
  totalCommits: number;
  uniqueAuthors: number;
  operations: { M?: number; A?: number; D?: number; R?: number };
  ageDays: number;
  lastModifiedDaysAgo?: number; // Optional: days since last modification
}

export interface HealthScoreResult {
  score: number; // 0-100
  category: "critical" | "medium" | "healthy";
  churnRate: number; // 0-1
  busFactor: "high-risk" | "medium-risk" | "low-risk";
  factors: {
    churn: { value: number; score: number; weight: number };
    authors: { value: number; score: number; weight: number };
    age: { value: number; score: number; weight: number };
  };
}

export class HealthScoreCalculator {
  // Weights for scoring components
  private static readonly WEIGHTS = {
    churn: 0.4,
    authors: 0.3,
    age: 0.3,
  };

  // Thresholds
  private static readonly DORMANT_THRESHOLD_DAYS = 180;
  private static readonly VERY_DORMANT_THRESHOLD_DAYS = 365;

  /**
   * Calculate comprehensive health score for a file
   */
  static calculate(inputs: HealthScoreInputs): HealthScoreResult {
    const churnRate = this.calculateChurnRate(inputs.operations);
    const churnScore = this.scoreChurn(churnRate);
    const authorScore = this.scoreAuthors(inputs.uniqueAuthors);
    const ageScore = this.scoreAge(inputs.ageDays, inputs.lastModifiedDaysAgo);

    const totalScore = Math.round(
      churnScore * this.WEIGHTS.churn +
        authorScore * this.WEIGHTS.authors +
        ageScore * this.WEIGHTS.age,
    );

    return {
      score: Math.max(0, Math.min(100, totalScore)),
      category: this.categorize(totalScore),
      churnRate,
      busFactor: this.calculateBusFactor(inputs.uniqueAuthors),
      factors: {
        churn: {
          value: churnRate,
          score: churnScore,
          weight: this.WEIGHTS.churn,
        },
        authors: {
          value: inputs.uniqueAuthors,
          score: authorScore,
          weight: this.WEIGHTS.authors,
        },
        age: {
          value: inputs.ageDays,
          score: ageScore,
          weight: this.WEIGHTS.age,
        },
      },
    };
  }

  /**
   * Calculate churn rate: M / (M + A + D + R)
   * High churn = code frequently rewritten = potential instability
   */
  private static calculateChurnRate(
    operations: HealthScoreInputs["operations"],
  ): number {
    const M = operations.M || 0; // Modifications
    const A = operations.A || 0; // Additions
    const D = operations.D || 0; // Deletions
    const R = operations.R || 0; // Renames

    const total = M + A + D + R;
    if (total === 0) return 0;

    return M / total;
  }

  /**
   * Score churn rate (inverted: low churn = healthy)
   * - 0-30% churn: 90-100 score (healthy, mostly additions)
   * - 30-50% churn: 70-90 score (normal maintenance)
   * - 50-70% churn: 40-70 score (high maintenance)
   * - 70-100% churn: 0-40 score (critical, constant rewrites)
   */
  private static scoreChurn(churnRate: number): number {
    if (churnRate <= 0.3) return 90 + (0.3 - churnRate) * 33; // 90-100
    if (churnRate <= 0.5) return 70 + (0.5 - churnRate) * 100; // 70-90
    if (churnRate <= 0.7) return 40 + (0.7 - churnRate) * 150; // 40-70
    return Math.max(0, 40 - (churnRate - 0.7) * 133); // 0-40
  }

  /**
   * Score author diversity with diminishing returns
   * - 1 author: 30 (high bus factor risk)
   * - 2 authors: 60 (moderate risk)
   * - 3-5 authors: 80-90 (healthy)
   * - 5+ authors: 90-100 (very healthy, diminishing returns)
   */
  private static scoreAuthors(uniqueAuthors: number): number {
    if (uniqueAuthors <= 0) return 0;
    if (uniqueAuthors === 1) return 30;
    if (uniqueAuthors === 2) return 60;
    if (uniqueAuthors <= 5) {
      // Linear scale from 60 to 90 for 2-5 authors
      return 60 + ((uniqueAuthors - 2) / 3) * 30;
    }
    // Logarithmic scale for 5+ authors (diminishing returns)
    return Math.min(100, 90 + Math.log10(uniqueAuthors - 4) * 10);
  }

  /**
   * Score age with dormancy penalties
   * - Active files (recent modifications): 100
   * - 0-180 days dormant: 90-100
   * - 180-365 days dormant: 70-90 (10% penalty)
   * - 365+ days dormant: 50-70 (20% penalty)
   */
  private static scoreAge(
    _ageDays: number,
    lastModifiedDaysAgo?: number,
  ): number {
    const dormantDays = lastModifiedDaysAgo ?? 0;

    if (dormantDays === 0) return 100; // Recently modified
    if (dormantDays <= this.DORMANT_THRESHOLD_DAYS) {
      // Gradual decline from 100 to 90
      return 100 - (dormantDays / this.DORMANT_THRESHOLD_DAYS) * 10;
    }
    if (dormantDays <= this.VERY_DORMANT_THRESHOLD_DAYS) {
      // 10% penalty: 80-90 range
      return (
        90 -
        ((dormantDays - this.DORMANT_THRESHOLD_DAYS) /
          (this.VERY_DORMANT_THRESHOLD_DAYS - this.DORMANT_THRESHOLD_DAYS)) *
          10
      );
    }
    // 20% penalty: 70-80 range
    const excessDays = dormantDays - this.VERY_DORMANT_THRESHOLD_DAYS;
    return Math.max(70, 80 - Math.min(excessDays / 365, 1) * 10);
  }

  /**
   * Categorize score into risk levels
   */
  static categorize(score: number): "critical" | "medium" | "healthy" {
    if (score <= 30) return "critical";
    if (score <= 60) return "medium";
    return "healthy";
  }

  /**
   * Calculate bus factor risk based on contributor count
   */
  static calculateBusFactor(
    authors: number,
  ): "high-risk" | "medium-risk" | "low-risk" {
    if (authors < 2) return "high-risk";
    if (authors < 4) return "medium-risk";
    return "low-risk";
  }

  /**
   * Get color for health score (HSL format)
   * - Healthy: Green (145, 60%, 35-50%)
   * - Medium: Amber (45, 70%, 45-60%)
   * - Critical: Red (0, 70%, 35-45%)
   */
  static getHealthColor(score: number): string {
    if (score <= 30) {
      // Critical: Red with intensity based on score
      const lightness = 35 + (score / 30) * 10; // 35-45%
      return `hsl(0, 70%, ${lightness}%)`;
    }
    if (score <= 60) {
      // Medium: Amber with gradient
      const lightness = 45 + ((score - 30) / 30) * 15; // 45-60%
      return `hsl(45, 70%, ${lightness}%)`;
    }
    // Healthy: Green with intensity based on score
    const lightness = 35 + ((score - 60) / 40) * 15; // 35-50%
    return `hsl(145, 60%, ${lightness}%)`;
  }

  /**
   * Batch calculate scores for multiple files
   */
  static batchCalculate(files: HealthScoreInputs[]): HealthScoreResult[] {
    return files.map((file) => this.calculate(file));
  }

  /**
   * Get insight message based on health metrics
   */
  static getInsight(result: HealthScoreResult): string {
    const { category, churnRate, busFactor } = result;

    if (category === "critical") {
      if (churnRate > 0.7 && busFactor === "high-risk") {
        return "Critical technical debt detected. High churn with low contributor diversity suggests reactive maintenance rather than planned evolution.";
      }
      if (churnRate > 0.7) {
        return "High instability detected. Frequent rewrites indicate the file may need refactoring or has unclear requirements.";
      }
      if (busFactor === "high-risk") {
        return "Knowledge silo detected. Single contributor creates organizational risk if they leave the project.";
      }
      return "This file requires immediate attention. Consider refactoring or increasing test coverage.";
    }

    if (category === "medium") {
      if (result.factors.age.score < 70) {
        return "File has been dormant for extended period. May be stable/complete, or candidate for deprecation review.";
      }
      if (churnRate > 0.5) {
        return "Moderate instability. Monitor for patterns - may need architectural improvements.";
      }
      return "File is in acceptable condition but could benefit from additional contributors or refactoring.";
    }

    return "Healthy file with good maintenance patterns. Continue current practices.";
  }
}
