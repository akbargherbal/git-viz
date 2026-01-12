// src/services/data/DataLoader.ts

import Papa from 'papaparse';
import { FileEvent, FileSummary } from '@/types/domain';

/**
 * Data loading service with optimized CSV parsing and streaming support
 */

export interface LoadProgress {
  loaded: number;
  total: number;
  phase: 'events' | 'summary' | 'complete';
}

export class DataLoader {
  private static instance: DataLoader;
  
  private constructor() {}
  
  static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }
  
  /**
   * Load events with streaming support and progress callbacks
   */
  async loadEvents(
    url: string, 
    onProgress?: (loaded: number) => void
  ): Promise<FileEvent[]> {
    // Resolve URL to absolute path to avoid worker relative path issues
    const absoluteUrl = new URL(url, window.location.href).href;

    return new Promise((resolve, reject) => {
      const events: FileEvent[] = [];
      let rowCount = 0;
      const startTime = performance.now();
      
      Papa.parse(absoluteUrl, {
        download: true,        // Stream directly from URL
        worker: true,          // Use Web Worker for parsing (non-blocking)
        header: true,
        dynamicTyping: true,   // Auto-parse numbers (faster than manual parseInt)
        skipEmptyLines: true,
        
        step: (results, parser) => {
          try {
            rowCount++;
            const row = results.data as any;
            
            // Basic validation - skip invalid rows
            if (!row.file_path || !row.commit_datetime) {
              return;
            }
            
            // Validate date before creating Date object
            const dateValue = new Date(row.commit_datetime);
            if (isNaN(dateValue.getTime())) {
              console.warn(`Invalid date for row ${rowCount}: ${row.commit_datetime}`);
              return;
            }
            
            const event: FileEvent = {
              file_path: String(row.file_path),
              status: row.status || 'modified',
              commit_hash: row.commit_hash || '',
              commit_datetime: dateValue,
              commit_timestamp: row.commit_timestamp || 0,
              author_name: row.author_name || '',
              author_email: row.author_email || '',
              commit_subject: row.commit_subject || '',
              old_mode: row.old_mode || 0,
              new_mode: row.new_mode || 0,
              old_sha: row.old_sha || '',
              new_sha: row.new_sha || '',
              old_path: row.old_path || undefined,
              new_path: row.new_path || undefined,
              similarity: row.similarity || undefined,
            };
            
            events.push(event);
            
            // Report progress every 100 rows to avoid excessive updates
            if (events.length % 100 === 0 && onProgress) {
              onProgress(events.length);
            }
            
          } catch (error) {
            console.warn(`Failed to parse row ${rowCount}:`, error);
          }
        },
        
        complete: () => {
          const loadTime = performance.now() - startTime;
          console.log(`✅ Loaded ${events.length} events in ${(loadTime / 1000).toFixed(2)}s (streaming mode)`);
          console.log(`   Processed ${rowCount} rows total`);
          console.log(`   Valid events: ${events.length}`);
          console.log(`   Skipped: ${rowCount - events.length}`);
          
          // Final progress update
          if (onProgress) {
            onProgress(events.length);
          }
          
          resolve(events);
        },
        
        error: (error) => {
          console.error('CSV parsing error:', error);
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }
  
  /**
   * Load summary data with streaming support
   */
  async loadSummary(
    url: string,
    onProgress?: (loaded: number) => void
  ): Promise<FileSummary[]> {
    // Resolve URL to absolute path to avoid worker relative path issues
    const absoluteUrl = new URL(url, window.location.href).href;

    return new Promise((resolve, reject) => {
      const summary: FileSummary[] = [];
      let rowCount = 0;
      const startTime = performance.now();
      
      Papa.parse(absoluteUrl, {
        download: true,
        worker: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        
        step: (results, parser) => {
          try {
            rowCount++;
            const row = results.data as any;
            
            // Validation
            if (!row.file_path) {
              return;
            }
            
            const summaryItem: FileSummary = {
              file_path: String(row.file_path),
              total_events: row.total_events || 0,
              added_count: row.added_count || 0,
              modified_count: row.modified_count || 0,
              deleted_count: row.deleted_count || 0,
              renamed_count: row.renamed_count || 0,
              copied_count: row.copied_count || 0,
              type_changed_count: row.type_changed_count || 0,
              first_seen: row.first_seen || '',
              last_seen: row.last_seen || '',
              first_commit: row.first_commit || '',
              last_commit: row.last_commit || '',
            };
            
            summary.push(summaryItem);
            
            // Report progress every 100 rows
            if (summary.length % 100 === 0 && onProgress) {
              onProgress(summary.length);
            }
            
          } catch (error) {
            console.warn(`Failed to parse summary row ${rowCount}:`, error);
          }
        },
        
        complete: () => {
          const loadTime = performance.now() - startTime;
          console.log(`✅ Loaded ${summary.length} file summaries in ${(loadTime / 1000).toFixed(2)}s`);
          
          if (onProgress) {
            onProgress(summary.length);
          }
          
          resolve(summary);
        },
        
        error: (error) => {
          console.error('CSV parsing error:', error);
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }
  
  /**
   * Load complete dataset with progress updates
   */
  async loadDataset(eventsUrl: string, summaryUrl: string) {
    const [events, summary] = await Promise.all([
      this.loadEvents(eventsUrl),
      this.loadSummary(summaryUrl),
    ]);
    
    return { events, summary };
  }
  
  /**
   * Load dataset with detailed progress callbacks
   */
  async loadDatasetWithProgress(
    eventsUrl: string,
    summaryUrl: string,
    onProgress?: (progress: LoadProgress) => void
  ) {
    const startTime = performance.now();
    
    // Load events with progress
    const eventsPromise = new Promise<FileEvent[]>((resolve) => {
      this.loadEvents(eventsUrl, (loaded) => {
        if (onProgress) {
          onProgress({
            loaded,
            total: 28065, // Approximate, will be updated
            phase: 'events',
          });
        }
      }).then(resolve);
    });
    
    // Load summary with progress
    const summaryPromise = new Promise<FileSummary[]>((resolve) => {
      this.loadSummary(summaryUrl, (loaded) => {
        if (onProgress) {
          onProgress({
            loaded,
            total: 2739, // Approximate
            phase: 'summary',
          });
        }
      }).then(resolve);
    });
    
    const [events, summary] = await Promise.all([
      eventsPromise,
      summaryPromise,
    ]);
    
    const totalTime = performance.now() - startTime;
    console.log(`🎉 Total dataset loaded in ${(totalTime / 1000).toFixed(2)}s`);
    
    if (onProgress) {
      onProgress({
        loaded: events.length,
        total: events.length,
        phase: 'complete',
      });
    }
    
    return { events, summary };
  }
  
  /**
   * Estimate download size (useful for progress bars)
   */
  async estimateSize(url: string): Promise<number> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength) : 0;
    } catch (error) {
      console.warn('Could not estimate file size:', error);
      return 0;
    }
  }
}

export const dataLoader = DataLoader.getInstance();