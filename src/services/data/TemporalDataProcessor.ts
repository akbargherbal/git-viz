// src/services/data/TemporalDataProcessor.ts
import { EnrichedFileData, TemporalFileData, TemporalDailyData } from '@/plugins/treemap-explorer/types';

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
    currentPosition: number
  ): TemporalFileData[] {
    const dateRange = this.getDateRange(temporalDaily);

    return files.map((file) => {
      const createdDate = file.first_seen || '';
      const lastModifiedDate = file.last_modified || '';
      const ageDays = file.age_days || 0;
      
      // Calculate dormant days
      const now = new Date();
      const lastModified = new Date(lastModifiedDate);
      const daysSinceModified = Math.floor(
        (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24)
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
        const rawPosition = ((createdTimestamp - minTimestamp) / (maxTimestamp - minTimestamp)) * 100;
        createdPosition = Math.max(0, Math.min(100, rawPosition));
      }

      // Determine if file is visible at current timeline position
      const isVisible = createdPosition <= currentPosition;

      // Build activity timeline (sample every 10th day for performance)
      const activityTimeline = this.buildActivityTimeline(file, temporalDaily);

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
  static getDateRange(temporalDaily: TemporalDailyData): { min: string; max: string } {
    if (!temporalDaily) {
      return { min: '2020-01-01', max: '2024-12-31' };
    }
    
    // Handle both Array and Object formats for 'days'
    let daysArray: any[] = [];
    if (Array.isArray(temporalDaily.days)) {
      daysArray = temporalDaily.days;
    } else if (typeof temporalDaily.days === 'object' && temporalDaily.days !== null) {
      daysArray = Object.values(temporalDaily.days);
    }

    if (daysArray.length === 0) {
      return { min: '2020-01-01', max: '2024-12-31' };
    }

    const dates = daysArray.map((d) => d.date).sort();
    return {
      min: dates[0],
      max: dates[dates.length - 1],
    };
  }

  /**
   * Build activity timeline for a file (sampled for performance)
   */
  private static buildActivityTimeline(
    _file: EnrichedFileData,
    _temporalDaily: TemporalDailyData
  ): Array<{ date: string; commits: number }> | undefined {
    // For now, return undefined - activity timeline requires file-level temporal data
    // which isn't available in temporal_daily.json (it's aggregated by day, not by file)
    return undefined;
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
