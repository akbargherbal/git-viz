// src/plugins/treemap-explorer/utils/__tests__/colorScales.coupling.test.ts

import { describe, it, expect } from 'vitest';
import { getCellColor } from '../colorScales';
import { EnrichedFileData } from '../../TreemapExplorerPlugin';

describe('colorScales - Coupling Lens', () => {
  // Mock File Data
  const mockFile: EnrichedFileData = {
    key: 'src/Target.ts',
    name: 'Target.ts',
    path: 'src/Target.ts',
    totalCommits: 10,
    uniqueAuthors: 2,
    operations: {},
    ageDays: 100,
    firstSeen: '',
    lastModified: '',
    value: 10,
    couplingMetrics: {
      maxStrength: 0.8,
      totalPartners: 5
    }
  };

  const mockState = {
    selectedFile: null,
    couplingThreshold: 0.5,
    timePosition: 100
  };

  it('should highlight hotspots when no file is selected', () => {
    // File has maxStrength 0.8 > threshold 0.5 -> Should be purple
    const color = getCellColor(mockFile, 'coupling', mockState);
    expect(color).toMatch(/hsl\(270/); // Purple hue
  });

  it('should dim files below threshold when no file is selected', () => {
    const weakFile = { 
      ...mockFile, 
      couplingMetrics: { maxStrength: 0.2, totalPartners: 1 } 
    };
    
    // maxStrength 0.2 < threshold 0.5 -> Should be dark gray
    const color = getCellColor(weakFile, 'coupling', mockState);
    expect(color).toBe('#27272a');
  });

  it('should highlight the selected file in white', () => {
    const stateWithSelection = { ...mockState, selectedFile: 'src/Target.ts' };
    const color = getCellColor(mockFile, 'coupling', stateWithSelection);
    expect(color).toBe('#ffffff');
  });

  it('should dim non-selected files (partners handled in renderer)', () => {
    // Note: The color scale handles the "base" color. 
    // The renderer overrides this for partners, but the base scale should return dimmed for non-selected.
    const stateWithSelection = { ...mockState, selectedFile: 'src/Other.ts' };
    const color = getCellColor(mockFile, 'coupling', stateWithSelection);
    expect(color).toBe('#18181b'); // Dimmed background
  });
});