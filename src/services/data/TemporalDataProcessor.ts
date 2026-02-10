// src/services/data/TemporalDataProcessor.ts

import {
  EnrichedFileData,
  TemporalFileData,
  TemporalDailyData,
} from "@/plugins/treemap-explorer/types";

export enum DateRangeConfidence {
  HIGH = "high", // From real temporal_daily data
  MEDIUM = "medium", // Calculated from file metadata
  LOW = "low", // Hardcoded fallback
}

export interface DateRangeResult {
  min: string;
  max: string;
  confidence: DateRangeConfidence;
  source: string;
}

/**
 * Processes temporal data and enriches files with time-based context
 */
export class TemporalDataProcessor {
  /**
   * Enrich files with temporal context based on timeline position
   */
  static enrichFilesWithTemporal(
    files: EnrichedFileData[],
    temporalDaily: TemporalDailyData,
    currentPosition: number,
    timelineCache?: Map<string, Array<{ date: string; commits: number }>>,
  ): TemporalFileData[] {
    // Use the new getDateRange API but extract just min/max for internal use
    const dateRangeResult = this.getDateRange(temporalDaily);
    const dateRange = { min: dateRangeResult.min, max: dateRangeResult.max };

    return files.map((file) => {
      const createdDate = file.first_seen || "";
      const lastModifiedDate = file.last_modified || "";
      const ageDays = file.age_days || 0;

      // Calculate dormant days
      const now = new Date();
      const lastModified = new Date(lastModifiedDate);
      const daysSinceModified = Math.floor(
        (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24),
      );
      const dormantDays = Math.max(0, daysSinceModified - 180);
      const isDormant = daysSinceModified > 180;

      // Calculate position when file was created (0-100 scale)
      const createdTimestamp = new Date(createdDate).getTime();
      const minTimestamp = new Date(dateRange.min).getTime();
      const maxTimestamp = new Date(dateRange.max).getTime();

      // FIX: Clamp position between 0 and 100 to handle dates outside range
      let createdPosition = 0;
      // ✅ ADDED CHECK: !isNaN(createdTimestamp) to prevent NaN when date is missing
      if (!isNaN(createdTimestamp) && maxTimestamp > minTimestamp) {
        const rawPosition =
          ((createdTimestamp - minTimestamp) / (maxTimestamp - minTimestamp)) *
          100;
        createdPosition = Math.max(0, Math.min(100, rawPosition));
      }

      // Determine if file is visible at current timeline position
      const isVisible = createdPosition <= currentPosition;

      const activityTimeline = timelineCache?.get(file.key);

      const enriched: TemporalFileData = {
        ...file,
        // Temporal-specific
        createdDate,
        lastModifiedDate,
        dormantDays,
        isDormant,
        isVisible,
        createdPosition,
        activityTimeline,

        // Ensure base fields exist (for backward compatibility with TimeView)
        ageDays,
        totalCommits: file.total_commits,
        uniqueAuthors: file.unique_authors,
        operations: file.operations || {},
      };

      return enriched;
    });
  }

  /**
   * Get date range from temporal daily data
   */
  static getDateRange(temporalDaily: TemporalDailyData): DateRangeResult {
    // Case 1: Real temporal data exists
    if (temporalDaily) {
      let daysArray: any[] = [];
      if (Array.isArray(temporalDaily.days)) {
        daysArray = temporalDaily.days;
      } else if (
        typeof temporalDaily.days === "object" &&
        temporalDaily.days !== null
      ) {
        daysArray = Object.values(temporalDaily.days);
      }

      if (daysArray.length > 0) {
        const dates = daysArray.map((d) => d.date).sort();
        console.log("[TemporalDataProcessor] Using real temporal data", {
          dateCount: dates.length,
          range: [dates[0], dates[dates.length - 1]],
        });
        return {
          min: dates[0],
          max: dates[dates.length - 1],
          confidence: DateRangeConfidence.HIGH,
          source: "temporal_daily dataset",
        };
      }
    }

    // Case 2: Fallback to hardcoded range
    console.warn(
      "[TemporalDataProcessor] ⚠️ FALLBACK: Using hardcoded date range. " +
        "temporal_daily dataset is missing or empty. Time lens will show full timeline.",
    );

    return {
      min: "2020-01-01",
      max: "2024-12-31",
      confidence: DateRangeConfidence.LOW,
      source: "hardcoded fallback",
    };
  }

  /**
   * Calculate date range from file metadata (medium confidence)
   * Used when temporal_daily is missing but files have dates
   */
  static calculateRangeFromFiles(
    files: Array<{ first_seen?: string; last_modified?: string }>,
  ): DateRangeResult | null {
    let minTime = Infinity;
    let maxTime = -Infinity;
    let validDates = 0;

    files.forEach((file) => {
      if (file.first_seen) {
        const t = new Date(file.first_seen).getTime();
        if (!isNaN(t) && t < minTime) {
          minTime = t;
          validDates++;
        }
      }
      if (file.last_modified) {
        const t = new Date(file.last_modified).getTime();
        if (!isNaN(t) && t > maxTime) {
          maxTime = t;
          validDates++;
        }
      }
    });

    if (minTime === Infinity || maxTime === -Infinity || validDates < 2) {
      return null; // Not enough data
    }

    const minDate = new Date(minTime).toISOString().split("T")[0];
    const maxDate = new Date(maxTime).toISOString().split("T")[0];

    console.log("[TemporalDataProcessor] Calculated range from file metadata", {
      filesScanned: files.length,
      validDates,
      range: [minDate, maxDate],
    });

    return {
      min: minDate,
      max: maxDate,
      confidence: DateRangeConfidence.MEDIUM,
      source: "calculated from file metadata",
    };
  }

  private static isValidDate(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  private static buildActivityTimeline(
    file: EnrichedFileData,
    fileLifecycle: any, // FileLifecycleData type
    bucketWeeks: number = 4,
    globalDateRange?: { min: string; max: string },
  ): Array<{ date: string; commits: number }> | undefined {
    // fileLifecycle structure: { files: { [path: string]: Array<{ date, type, ... }> } }
    const events = fileLifecycle?.files?.[file.path];
    if (!events || events.length === 0) return undefined;

    const validEvents = events.filter(
      (event: any) => event.datetime && this.isValidDate(event.datetime),
    );

    if (validEvents.length === 0) {
      return undefined; // No valid events
    }

    // NEW LOGIC: Use global range if provided
    if (globalDateRange) {
      return this.bucketEventsByQuarter(validEvents, globalDateRange);
    }

    // Group events into weekly buckets (legacy behavior)
    const buckets = this.bucketEventsByWeek(validEvents, bucketWeeks);

    // Return sparkline data points
    return buckets.map((bucket) => ({
      date: bucket.weekStart,
      commits: bucket.commitCount,
    }));
  }

  /**
   * NEW METHOD: Group events into quarterly buckets based on global range
   */
  private static bucketEventsByQuarter(
    events: Array<{ datetime: string; type: string }>,
    range: { min: string; max: string },
  ): Array<{ date: string; commits: number }> {
    const startDate = new Date(range.min);
    const endDate = new Date(range.max);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn("[TemporalDataProcessor] Invalid global date range");
      return [];
    }

    // Generate quarters
    const quarters: Array<{
      date: string;
      commits: number;
      start: Date;
      end: Date;
    }> = [];
    let current = new Date(
      startDate.getFullYear(),
      Math.floor(startDate.getMonth() / 3) * 3,
      1,
    );

    // Ensure we cover up to the end date
    while (current <= endDate || quarters.length === 0) {
      const qStart = new Date(current);
      const qEnd = new Date(current.getFullYear(), current.getMonth() + 3, 0); // End of quarter
      qEnd.setHours(23, 59, 59, 999);

      quarters.push({
        date: `Q${Math.floor(current.getMonth() / 3) + 1} ${current.getFullYear()}`,
        commits: 0,
        start: qStart,
        end: qEnd,
      });

      // Move to next quarter
      current.setMonth(current.getMonth() + 3);

      // Safety break to prevent infinite loops if dates are weird
      if (quarters.length > 100) break;
    }

    // Assign events to quarters
    events.forEach((event) => {
      const eventDate = new Date(event.datetime);
      if (isNaN(eventDate.getTime())) return;

      // Find matching quarter
      const quarter = quarters.find(
        (q) => eventDate >= q.start && eventDate <= q.end,
      );
      if (quarter) {
        quarter.commits++;
      }
    });

    return quarters.map((q) => ({ date: q.date, commits: q.commits }));
  }

  private static bucketEventsByWeek(
    events: Array<{ datetime: string; type: string }>,
    numBuckets: number = 4,
  ): Array<{ weekStart: string; commitCount: number }> {
    if (events.length === 0) return [];

    // Sort events by date
    const sortedEvents = events
      .slice()
      .sort(
        (a, b) =>
          new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
      );

    const firstDate = new Date(sortedEvents[0].datetime);
    const lastDate = new Date(sortedEvents[sortedEvents.length - 1].datetime);

    if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
      console.warn(
        "[TemporalDataProcessor] Invalid dates in event range, skipping timeline",
      );
      return [];
    }

    const totalDays = Math.max(
      1,
      Math.ceil(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    // Calculate bucket size in days
    const bucketSizeDays = Math.ceil(totalDays / numBuckets);

    // Initialize buckets
    const buckets: Array<{ weekStart: string; commitCount: number }> = [];
    for (let i = 0; i < numBuckets; i++) {
      const bucketStart = new Date(
        firstDate.getTime() + i * bucketSizeDays * 24 * 60 * 60 * 1000,
      );

      if (isNaN(bucketStart.getTime())) {
        console.warn(
          "[TemporalDataProcessor] Invalid bucket date computed, using fallback",
        );
        buckets.push({
          weekStart: firstDate.toISOString().split("T")[0],
          commitCount: 0,
        });
      } else {
        buckets.push({
          weekStart: bucketStart.toISOString().split("T")[0],
          commitCount: 0,
        });
      }
    }

    // Assign events to buckets
    sortedEvents.forEach((event) => {
      const eventDate = new Date(event.datetime);

      if (isNaN(eventDate.getTime())) {
        return;
      }

      const daysSinceFirst = Math.floor(
        (eventDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const bucketIndex = Math.min(
        Math.floor(daysSinceFirst / bucketSizeDays),
        numBuckets - 1,
      );
      buckets[bucketIndex].commitCount++;
    });

    return buckets;
  }

  static precomputeTimelines(
    files: EnrichedFileData[],
    fileLifecycle: any,
    bucketWeeks: number = 4,
    globalDateRange?: { min: string; max: string },
  ): Map<string, Array<{ date: string; commits: number }>> {
    const cache = new Map<string, Array<{ date: string; commits: number }>>();
    let successCount = 0;
    let failCount = 0;

    files.forEach((file) => {
      try {
        const timeline = this.buildActivityTimeline(
          file,
          fileLifecycle,
          bucketWeeks,
          globalDateRange,
        );
        if (timeline) {
          cache.set(file.key, timeline);
          successCount++;
        }
      } catch (error) {
        failCount++;
        console.warn(
          `[TemporalDataProcessor] Failed to build timeline for ${file.key}:`,
          error,
        );
      }
    });

    console.log(
      `[TemporalDataProcessor] Pre-computed ${successCount} activity timelines (${failCount} failed)`,
    );
    return cache;
  }

  /**
   * Calculate temporal statistics for a set of files
   */
  static calculateTemporalStats(files: TemporalFileData[]): {
    totalDormant: number;
    totalActive: number;
    avgAge: number;
  } {
    const dormantFiles = files.filter((f) => f.isDormant);
    const activeFiles = files.filter((f) => !f.isDormant);
    const avgAge =
      files.reduce((sum, f) => sum + (f.ageDays || 0), 0) / files.length || 0;

    return {
      totalDormant: dormantFiles.length,
      totalActive: activeFiles.length,
      avgAge: Math.round(avgAge),
    };
  }
}

// Re-export types for convenience
export type { EnrichedFileData, TemporalFileData, TemporalDailyData };
