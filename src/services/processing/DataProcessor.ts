// src/services/processing/DataProcessor.ts

import { FileEvent, DirectoryNode, TimeBinType } from '@/types/domain';
import { getTimeBinStart, advanceTimeBin, getTimeBinCount } from '@/utils/dateHelpers';

/**
 * Optimized data processing service for aggregation and transformation
 */

export class DataProcessor {
  // Cache for split paths to avoid repeated string operations
  private pathSplitCache: Map<string, string[]> = new Map();
  
  /**
   * Build directory tree from file paths (OPTIMIZED: single-pass algorithm)
   */
  buildDirectoryTree(events: FileEvent[]): DirectoryNode {
    const startTime = performance.now();
    
    const root: DirectoryNode = {
      name: 'root',
      path: '',
      level: 0,
      isDirectory: true,
      children: [],
      files: [],
      eventCount: 0,
      fileCount: 0,
    };
    
    const pathMap = new Map<string, DirectoryNode>();
    pathMap.set('', root);
    
    // Track unique file paths for file counting
    const uniqueFiles = new Set<string>();
    
    // OPTIMIZATION: Single pass through events
    // Build tree structure AND count events simultaneously
    for (const event of events) {
      uniqueFiles.add(event.file_path);
      
      // Get cached split or compute once
      let parts = this.pathSplitCache.get(event.file_path);
      if (!parts) {
        parts = event.file_path.split('/').filter(p => p.length > 0);
        this.pathSplitCache.set(event.file_path, parts);
      }
      
      let currentPath = '';
      let currentNode = root;
      
      // Build tree and count events in one pass
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLastPart = i === parts.length - 1;
        
        // Get or create node
        let node = pathMap.get(currentPath);
        if (!node) {
          node = {
            name: part,
            path: currentPath,
            level: i + 1,
            isDirectory: !isLastPart,
            children: !isLastPart ? [] : undefined,
            files: !isLastPart ? [] : undefined,
            eventCount: 0,
            fileCount: 0,
          };
          pathMap.set(currentPath, node);
          currentNode.children?.push(node);
        }
        
        // Increment event count for this node
        node.eventCount++;
        
        currentNode = node;
      }
    }
    
    // Set file counts for leaf nodes
    for (const filepath of uniqueFiles) {
      const parts = this.pathSplitCache.get(filepath) || 
                    filepath.split('/').filter(p => p.length > 0);
      
      if (parts.length > 0) {
        const leafPath = parts.join('/');
        const leafNode = pathMap.get(leafPath);
        if (leafNode && !leafNode.isDirectory) {
          leafNode.fileCount = 1;
        }
      }
    }
    
    // Calculate file counts for directories (bottom-up)
    const calculateFileCounts = (node: DirectoryNode): number => {
      if (!node.isDirectory) {
        return node.fileCount;
      }
      
      let count = 0;
      if (node.children) {
        for (const child of node.children) {
          count += calculateFileCounts(child);
        }
      }
      node.fileCount = count;
      return count;
    };
    
    calculateFileCounts(root);
    
    const buildTime = performance.now() - startTime;
    console.log(`✅ Built directory tree in ${buildTime.toFixed(2)}ms (${pathMap.size} nodes)`);
    
    return root;
  }
  
  /**
   * Get top directories by event count
   */
  getTopDirectories(tree: DirectoryNode, maxCount: number = 20): DirectoryNode[] {
    const directories: DirectoryNode[] = [];
    
    const traverse = (node: DirectoryNode) => {
      if (node.isDirectory && node.path) {
        directories.push(node);
      }
      node.children?.forEach(traverse);
    };
    
    traverse(tree);
    
    // Sort by event count descending and take top N
    return directories
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, maxCount);
  }
  
  /**
   * Filter events by time range
   */
  filterEventsByTimeRange(
    events: FileEvent[],
    startDate: Date,
    endDate: Date
  ): FileEvent[] {
    return events.filter(
      e => e.commit_datetime >= startDate && e.commit_datetime <= endDate
    );
  }
  
  /**
   * Filter events by directory (optimized with startsWith)
   */
  filterEventsByDirectory(events: FileEvent[], directory: string): FileEvent[] {
    if (!directory) return events;
    
    // Ensure directory ends with / for proper prefix matching
    const prefix = directory.endsWith('/') ? directory : `${directory}/`;
    
    return events.filter(e => 
      e.file_path === directory || e.file_path.startsWith(prefix)
    );
  }
  
  /**
   * Filter events by authors
   */
  filterEventsByAuthors(events: FileEvent[], authors: Set<string>): FileEvent[] {
    if (authors.size === 0) return events;
    return events.filter(e => authors.has(e.author_name));
  }
  
  /**
   * Get unique authors (sorted)
   */
  getUniqueAuthors(events: FileEvent[]): string[] {
    const authors = new Set(events.map(e => e.author_name));
    return Array.from(authors).sort();
  }
  
  /**
   * Get time bins for a range
   */
  getTimeBins(startDate: Date, endDate: Date, binType: TimeBinType): Date[] {
    const bins: Date[] = [];
    const count = getTimeBinCount(startDate, endDate, binType);
    let current = getTimeBinStart(startDate, binType);
    
    for (let i = 0; i < count; i++) {
      bins.push(current);
      current = advanceTimeBin(current, binType);
    }
    
    return bins;
  }
  
  /**
   * Aggregate events by time bin (OPTIMIZED: use timestamps for keys)
   */
  aggregateByTimeBin(
    events: FileEvent[],
    binType: TimeBinType
  ): Map<string, FileEvent[]> {
    const startTime = performance.now();
    const aggregated = new Map<string, FileEvent[]>();
    
    // Pre-allocate arrays for better performance
    const binCache = new Map<number, string>();
    
    for (const event of events) {
      const binStart = getTimeBinStart(event.commit_datetime, binType);
      
      // Use timestamp as cache key to avoid repeated toISOString() calls
      const timestamp = binStart.getTime();
      let key = binCache.get(timestamp);
      
      if (!key) {
        key = binStart.toISOString();
        binCache.set(timestamp, key);
      }
      
      if (!aggregated.has(key)) {
        aggregated.set(key, []);
      }
      aggregated.get(key)!.push(event);
    }
    
    const aggTime = performance.now() - startTime;
    console.log(`✅ Aggregated ${events.length} events into ${aggregated.size} bins in ${aggTime.toFixed(2)}ms`);
    
    return aggregated;
  }
  
  /**
   * Aggregate events by directory and time bin
   */
  aggregateByDirectoryAndTime(
    events: FileEvent[],
    directories: string[],
    binType: TimeBinType
  ): Map<string, Map<string, FileEvent[]>> {
    const result = new Map<string, Map<string, FileEvent[]>>();
    
    // Initialize maps for each directory
    for (const dir of directories) {
      result.set(dir, new Map());
    }
    
    // Aggregate events
    for (const event of events) {
      // Find which directory this event belongs to
      for (const dir of directories) {
        if (event.file_path === dir || event.file_path.startsWith(`${dir}/`)) {
          const binStart = getTimeBinStart(event.commit_datetime, binType);
          const timeKey = binStart.toISOString();
          
          const dirMap = result.get(dir)!;
          if (!dirMap.has(timeKey)) {
            dirMap.set(timeKey, []);
          }
          dirMap.get(timeKey)!.push(event);
          break; // Only add to first matching directory
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get statistics for events
   */
  getEventStatistics(events: FileEvent[]) {
    const stats = {
      total: events.length,
      byStatus: new Map<string, number>(),
      byAuthor: new Map<string, number>(),
      dateRange: {
        start: new Date(Math.min(...events.map(e => e.commit_datetime.getTime()))),
        end: new Date(Math.max(...events.map(e => e.commit_datetime.getTime()))),
      },
      uniqueFiles: new Set(events.map(e => e.file_path)).size,
      uniqueAuthors: new Set(events.map(e => e.author_name)).size,
    };
    
    // Count by status
    for (const event of events) {
      const count = stats.byStatus.get(event.status) || 0;
      stats.byStatus.set(event.status, count + 1);
    }
    
    // Count by author
    for (const event of events) {
      const count = stats.byAuthor.get(event.author_name) || 0;
      stats.byAuthor.set(event.author_name, count + 1);
    }
    
    return stats;
  }
  
  /**
   * Clear caches (call when processing new dataset)
   */
  clearCaches(): void {
    this.pathSplitCache.clear();
  }
}

export const dataProcessor = new DataProcessor();