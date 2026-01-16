// src/services/data/__tests__/CouplingDataProcessor.test.ts

import { describe, it, expect } from 'vitest';
import { CouplingDataProcessor } from '../CouplingDataProcessor';

describe('CouplingDataProcessor', () => {
  // Mock Data
  const mockRawData = {
    edges: [
      { source: 'src/A.ts', target: 'src/B.ts', cochangeCount: 10, couplingStrength: 0.8 },
      { source: 'src/A.ts', target: 'src/C.ts', cochangeCount: 5, couplingStrength: 0.4 },
      { source: 'src/B.ts', target: 'src/D.ts', cochangeCount: 2, couplingStrength: 0.2 },
    ]
  };

  describe('process', () => {
    it('should build a bidirectional coupling index', () => {
      const index = CouplingDataProcessor.process(mockRawData);

      expect(index.has('src/A.ts')).toBe(true);
      expect(index.has('src/B.ts')).toBe(true);
      
      // Check A -> B
      const aPartners = index.get('src/A.ts')?.partners;
      expect(aPartners).toBeDefined();
      expect(aPartners?.find(p => p.filePath === 'src/B.ts')?.strength).toBe(0.8);

      // Check B -> A (Reverse edge)
      const bPartners = index.get('src/B.ts')?.partners;
      expect(bPartners).toBeDefined();
      expect(bPartners?.find(p => p.filePath === 'src/A.ts')?.strength).toBe(0.8);
    });

    it('should calculate aggregate metrics correctly', () => {
      const index = CouplingDataProcessor.process(mockRawData);
      const fileA = index.get('src/A.ts');

      expect(fileA).toBeDefined();
      expect(fileA?.maxStrength).toBe(0.8);
      expect(fileA?.totalPartners).toBe(2); // B and C
      // Avg: (0.8 + 0.4) / 2 = 0.6
      expect(fileA?.avgStrength).toBeCloseTo(0.6);
    });

    it('should handle empty or invalid input gracefully', () => {
      const index = CouplingDataProcessor.process({});
      expect(index.size).toBe(0);
    });
  });

  describe('getTopCouplings', () => {
    const index = CouplingDataProcessor.process(mockRawData);

    it('should return partners sorted by strength descending', () => {
      const partners = CouplingDataProcessor.getTopCouplings(index, 'src/A.ts');
      
      expect(partners[0].filePath).toBe('src/B.ts'); // 0.8
      expect(partners[1].filePath).toBe('src/C.ts'); // 0.4
    });

    it('should respect the limit (topN)', () => {
      const partners = CouplingDataProcessor.getTopCouplings(index, 'src/A.ts', 1);
      expect(partners.length).toBe(1);
      expect(partners[0].filePath).toBe('src/B.ts');
    });
  });

  describe('getFileCouplingMetrics', () => {
    const index = CouplingDataProcessor.process(mockRawData);

    it('should return correct metrics for a file', () => {
      const metrics = CouplingDataProcessor.getFileCouplingMetrics(index, 'src/A.ts');
      
      expect(metrics.maxStrength).toBe(0.8);
      expect(metrics.totalPartners).toBe(2);
      expect(metrics.strongCouplings).toBe(1); // Only 0.8 is > 0.5
    });

    it('should return zero metrics for unknown file', () => {
      const metrics = CouplingDataProcessor.getFileCouplingMetrics(index, 'unknown.ts');
      
      expect(metrics.maxStrength).toBe(0);
      expect(metrics.totalPartners).toBe(0);
    });
  });

  describe('getNetworkStats', () => {
    it('should calculate global network statistics', () => {
      const index = CouplingDataProcessor.process(mockRawData);
      const stats = CouplingDataProcessor.getNetworkStats(index);

      // Files involved: A, B, C, D
      expect(stats.totalFiles).toBe(4);
      
      // Edges: A-B, A-C, B-D (bidirectional = 6 edges total in map)
      expect(stats.totalEdges).toBe(6);
      
      // Strongly coupled files (maxStrength > 0.5): A(0.8), B(0.8)
      expect(stats.stronglyCoupledFiles).toBe(2);
    });
  });
});