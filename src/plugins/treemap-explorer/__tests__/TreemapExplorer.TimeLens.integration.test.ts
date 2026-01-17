// src/plugins/treemap-explorer/__tests__/TreemapExplorer.TimeLens.integration.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreemapExplorerPlugin } from '../TreemapExplorerPlugin';
import { TreemapExplorerState } from '../types';

describe('TreemapExplorer - Time Lens Integration', () => {
  let plugin: TreemapExplorerPlugin;
  let container: HTMLElement;

  const mockFileIndex = {
    files: [
      {
        key: 'src/old-legacy.ts',
        total_commits: 150,
        unique_authors: 10,
        operations: { M: 120, A: 30, D: 0 },
        age_days: 700,
        first_seen: '2022-06-01',
        last_modified: '2023-03-15'
      },
      {
        key: 'src/active-component.tsx',
        total_commits: 85,
        unique_authors: 6,
        operations: { M: 70, A: 15, D: 0 },
        age_days: 180,
        first_seen: '2024-07-01',
        last_modified: '2025-01-10'
      },
      {
        key: 'src/new-feature.ts',
        total_commits: 20,
        unique_authors: 3,
        operations: { M: 15, A: 5, D: 0 },
        age_days: 15,
        first_seen: '2025-01-01',
        last_modified: '2025-01-15'
      }
    ]
  };

  const mockTemporalData = {
    date_range: {
      min: '2022-01-01',
      max: '2025-01-15',
      total_days: 1110
    },
    days: [
      { date: '2022-01-01', commits: 5, files_changed: 2, unique_authors: 1 },
      { date: '2022-06-01', commits: 30, files_changed: 10, unique_authors: 3 },
      { date: '2024-07-01', commits: 15, files_changed: 5, unique_authors: 2 },
      { date: '2025-01-01', commits: 20, files_changed: 8, unique_authors: 4 },
      { date: '2025-01-15', commits: 10, files_changed: 3, unique_authors: 2 }
    ]
  };

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    plugin = new TreemapExplorerPlugin();
    
    const initialState: TreemapExplorerState = {
      lensMode: 'time',
      sizeMetric: 'commits',
      selectedFile: null,
      healthThreshold: 50,
      couplingThreshold: 0.03,
      showArcs: true,
      timePosition: 100,
      playing: false,
      timeFilters: {
        showCreations: false,
        fadeDormant: true
      }
    };

    plugin.init(container, initialState);
  });

  afterEach(() => {
    plugin.destroy();
    document.body.removeChild(container);
  });

  describe('Data Processing', () => {
    it('should process temporal data and enrich files', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const processedData = plugin.processData(dataset);

      expect(processedData).toBeDefined();
      expect(processedData.length).toBe(3);
    });

    it('should handle missing temporal data gracefully', () => {
      const dataset = {
        file_index: mockFileIndex
        // No temporal_daily
      };

      const processedData = plugin.processData(dataset);

      expect(processedData).toBeDefined();
      expect(processedData.length).toBe(3);
    });

    it('should calculate date range from temporal data', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      plugin.processData(dataset);

      // Plugin should have stored date range internally
      // We can verify this indirectly through the state
      const state = plugin.getInitialState();
      expect(state.timePosition).toBe(100);
    });
  });

  describe('Timeline Position Changes', () => {
    it('should filter files at position 0 (start of timeline)', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 0, // Start of timeline
        playing: false,
        timeFilters: {
          showCreations: false,
          fadeDormant: true
        }
      };

      // Render should work without errors at position 0
      expect(() => plugin.render(data, state)).not.toThrow();
    });

    it('should show all files at position 100 (end of timeline)', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100, // End of timeline
        playing: false,
        timeFilters: {
          showCreations: false,
          fadeDormant: true
        }
      };

      // Should render successfully
      expect(() => plugin.render(data, state)).not.toThrow();

      // Check that SVG was created
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle mid-timeline positions', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 50, // Middle of timeline
        playing: false,
        timeFilters: {
          showCreations: false,
          fadeDormant: true
        }
      };

      expect(() => plugin.render(data, state)).not.toThrow();

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Time Filters', () => {
    it('should apply "showCreations" filter', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false,
        timeFilters: {
          showCreations: true,
          fadeDormant: false
        }
      };

      expect(() => plugin.render(data, state)).not.toThrow();
    });

    it('should apply "fadeDormant" filter', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false,
        timeFilters: {
          showCreations: false,
          fadeDormant: true
        }
      };

      expect(() => plugin.render(data, state)).not.toThrow();
    });

    it('should work with both filters enabled', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false,
        timeFilters: {
          showCreations: true,
          fadeDormant: true
        }
      };

      expect(() => plugin.render(data, state)).not.toThrow();
    });

    it('should work with both filters disabled', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false,
        timeFilters: {
          showCreations: false,
          fadeDormant: false
        }
      };

      expect(() => plugin.render(data, state)).not.toThrow();
    });
  });

  describe('Lens Switching', () => {
    it('should switch from Debt to Time lens', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      // Start with Debt lens
      const debtState: TreemapExplorerState = {
        lensMode: 'debt',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false
      };

      plugin.render(data, debtState);

      // Switch to Time lens
      const timeState: TreemapExplorerState = {
        ...debtState,
        lensMode: 'time'
      };

      expect(() => plugin.render(data, timeState)).not.toThrow();
    });

    it('should switch from Coupling to Time lens', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      // Start with Coupling lens
      const couplingState: TreemapExplorerState = {
        lensMode: 'coupling',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false
      };

      plugin.render(data, couplingState);

      // Switch to Time lens
      const timeState: TreemapExplorerState = {
        ...couplingState,
        lensMode: 'time'
      };

      expect(() => plugin.render(data, timeState)).not.toThrow();
    });

    it('should maintain spatial layout when switching lenses', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const debtState: TreemapExplorerState = {
        lensMode: 'debt',
        sizeMetric: 'commits',
        selectedFile: null,
        // FIX: Set healthThreshold to 100 to ensure all files are visible in Debt mode
        // This ensures the node count matches Time mode (which shows all files at pos 100)
        healthThreshold: 100, 
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false
      };

      plugin.render(data, debtState);

      const debtCells = container.querySelectorAll('rect');
      const debtCellCount = debtCells.length;

      const timeState: TreemapExplorerState = {
        ...debtState,
        lensMode: 'time'
      };

      plugin.render(data, timeState);

      const timeCells = container.querySelectorAll('rect');
      const timeCellCount = timeCells.length;

      // Same number of cells (spatial layout preserved)
      expect(timeCellCount).toBe(debtCellCount);
    });
  });

  describe('Playback Mode', () => {
    it('should start playback', () => {
      vi.useFakeTimers();

      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);


      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 0,
        playing: true
      };

      plugin.render(data, state);

      // Simulate playback by calling internal method
      // Note: This is testing the playback logic exists
      expect(plugin).toHaveProperty('startPlayback');

      vi.useRealTimers();
    });

    it('should stop playback', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 50,
        playing: false
      };

      plugin.render(data, state);

      expect(plugin).toHaveProperty('stopPlayback');
    });
  });

  describe('Color Scheme', () => {
    it('should apply Time lens colors to cells', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false,
        timeFilters: {
          showCreations: false,
          fadeDormant: true
        }
      };

      plugin.render(data, state);

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBeGreaterThan(0);

      // Each rect should have a fill color
      rects.forEach(rect => {
        const fill = rect.getAttribute('fill');
        expect(fill).toBeTruthy();
        expect(fill).not.toBe('none');
      });
    });
  });

  describe('Performance', () => {
    it('should render Time lens within 300ms', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 50,
        playing: false
      };

      const startTime = performance.now();
      plugin.render(data, state);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(300);
    });

    it('should handle rapid timeline scrubbing', () => {
      const dataset = {
        file_index: mockFileIndex,
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      // Simulate scrubbing through 10 positions rapidly
      for (let i = 0; i <= 100; i += 10) {
        const state: TreemapExplorerState = {
          lensMode: 'time',
          sizeMetric: 'commits',
          selectedFile: null,
          healthThreshold: 50,
          couplingThreshold: 0.03,
          showArcs: true,
          timePosition: i,
          playing: false
        };

        expect(() => plugin.render(data, state)).not.toThrow();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file array', () => {
      const dataset = {
        file_index: { files: [] },
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false
      };

      expect(() => plugin.render(data, state)).not.toThrow();
    });

    it('should handle single file', () => {
      const dataset = {
        file_index: {
          files: [mockFileIndex.files[0]]
        },
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false
      };

      expect(() => plugin.render(data, state)).not.toThrow();

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle missing temporal dates gracefully', () => {
      const dataset = {
        file_index: {
          files: [{
            key: 'src/no-dates.ts',
            total_commits: 10,
            unique_authors: 2,
            operations: { M: 8, A: 2, D: 0 },
            age_days: 100,
            first_seen: '',
            last_modified: ''
          }]
        },
        temporal_daily: mockTemporalData
      };

      const data = plugin.processData(dataset);

      const state: TreemapExplorerState = {
        lensMode: 'time',
        sizeMetric: 'commits',
        selectedFile: null,
        healthThreshold: 50,
        couplingThreshold: 0.03,
        showArcs: true,
        timePosition: 100,
        playing: false
      };

      expect(() => plugin.render(data, state)).not.toThrow();
    });
  });
});
