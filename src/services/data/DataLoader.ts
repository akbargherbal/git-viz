// src/services/data/DataLoader.ts

import { OptimizedDataset } from '@/types/plugin';

export interface LoadProgress {
  loaded: number;
  total: number;
  phase: 'metadata' | 'tree' | 'activity' | 'complete';
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
  
  private async fetchJson(url: string, name: string) {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Failed to load ${name}: ${res.status} ${res.statusText}`);
    }
    
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(
        `Failed to load ${name}: Server returned HTML instead of JSON. \n` +
        `Ensure the file exists in the 'public/' directory.`
      );
    }
    
    return res.json();
  }
  
  /**
   * Load the optimized JSON datasets in parallel
   */
  async loadOptimizedDataset(
    baseUrl: string = '/DATASETS_excalidraw', // Changed to absolute path
    onProgress?: (progress: LoadProgress) => void
  ): Promise<OptimizedDataset> {
    const startTime = performance.now();
    
    try {
      // 1. Load Metadata
      if (onProgress) onProgress({ loaded: 0, total: 3, phase: 'metadata' });
      const metadata = await this.fetchJson(`${baseUrl}/repo_metadata.json`, 'Metadata');
      
      // 2. Load Directory Tree
      if (onProgress) onProgress({ loaded: 1, total: 3, phase: 'tree' });
      const tree = await this.fetchJson(`${baseUrl}/directory_tree.json`, 'Directory Tree');
      
      // 3. Load Activity Matrix
      if (onProgress) onProgress({ loaded: 2, total: 3, phase: 'activity' });
      const activity = await this.fetchJson(`${baseUrl}/activity_matrix.json`, 'Activity Matrix');
      
      const totalTime = performance.now() - startTime;
      console.log(`🎉 Optimized dataset loaded in ${(totalTime / 1000).toFixed(2)}s`);
      
      if (onProgress) onProgress({ loaded: 3, total: 3, phase: 'complete' });
      
      return { metadata, tree, activity };
      
    } catch (error) {
      console.error('Error loading optimized dataset:', error);
      throw error;
    }
  }
  
  // Legacy methods kept for compatibility
  async loadEvents(url: string): Promise<any[]> { return []; }
  async loadSummary(url: string): Promise<any[]> { return []; }
}

export const dataLoader = DataLoader.getInstance();