// src/services/data/TemporalDataProcessor.ts
// PHASE 3: Time Lens Activity Data - Activity timeline implementation with date validation

import {
  EnrichedFileData,
  TemporalFileData,
  TemporalDailyData,
} from "@/plugins/treemap-explorer/types";

/**
 * Processes temporal data and enriches files with time-based context
 */
export class TemporalDataProcessor {
  /**
   * Enrich files with temporal context based on timeline position
   * PHASE 3: Now accepts optional timeline cache for performance
   */
  static enrichFilesWithTemporal(
    files: EnrichedFileData[],
    temporalDaily: TemporalDailyData,
    currentPosition: number,
    timelineCache?: Map<string, Array<{ date: string; commits: number }>>,
  ): TemporalFileData[] {
    const dateRange = this.getDateRange(temporalDaily);

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
      if (maxTimestamp > minTimestamp) {
        const rawPosition =
          ((createdTimestamp - minTimestamp) / (maxTimestamp - minTimestamp)) *
          100;
        createdPosition = Math.max(0, Math.min(100, rawPosition));
      }

      // Determine if file is visible at current timeline position
      const isVisible = createdPosition <= currentPosition;

      // PHASE 3: Use pre-computed timeline from cache if available
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
  static getDateRange(temporalDaily: TemporalDailyData): {
    min: string;
    max: string;
  } {
    if (!temporalDaily) {
      return { min: "2020-01-01", max: "2024-12-31" };
    }

    // Handle both Array and Object formats for 'days'
    let daysArray: any[] = [];
    if (Array.isArray(temporalDaily.days)) {
      daysArray = temporalDaily.days;
    } else if (
      typeof temporalDaily.days === "object" &&
      temporalDaily.days !== null
    ) {
      daysArray = Object.values(temporalDaily.days);
    }

    if (daysArray.length === 0) {
      return { min: "2020-01-01", max: "2024-12-31" };
    }

    const dates = daysArray.map((d) => d.date).sort();
    return {
      min: dates[0],
      max: dates[dates.length - 1],
    };
  }

  /**
   * PHASE 3: Validate if a date string is valid
   */
  private static isValidDate(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * PHASE 3: Build activity timeline for a file (bucketed into weeks)
   */
  private static buildActivityTimeline(
    file: EnrichedFileData,
    fileLifecycle: any, // FileLifecycleData type
    bucketWeeks: number = 4,
  ): Array<{ date: string; commits: number }> | undefined {
    // fileLifecycle structure: { files: { [path: string]: Array<{ date, type, ... }> } }
    const events = fileLifecycle?.files?.[file.path];
    if (!events || events.length === 0) return undefined;

    // PHASE 3: Filter out events with invalid dates
    const validEvents = events.filter(
      (event: any) => event.datetime && this.isValidDate(event.datetime),
    );

    if (validEvents.length === 0) {
      return undefined; // No valid events
    }

    // Group events into weekly buckets
    const buckets = this.bucketEventsByWeek(validEvents, bucketWeeks);

    // Return sparkline data points
    return buckets.map((bucket) => ({
      date: bucket.weekStart,
      commits: bucket.commitCount,
    }));
  }

  /**
   * PHASE 3: Group events into weekly buckets for sparkline visualization
   */
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

    // PHASE 3: Validate that firstDate and lastDate are valid
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

      // PHASE 3: Validate bucket date before calling toISOString
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

      // PHASE 3: Skip invalid event dates
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

  /**
   * PHASE 3: Pre-compute timelines for all files (performance optimization)
   */
  static precomputeTimelines(
    files: EnrichedFileData[],
    fileLifecycle: any,
    bucketWeeks: number = 4,
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
        );
        if (timeline) {
          cache.set(file.key, timeline);
          successCount++;
        }
      } catch (error) {
        // PHASE 3: Gracefully handle errors for individual files
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
