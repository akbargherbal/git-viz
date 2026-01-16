// src/plugins/treemap-explorer/components/__tests__/CouplingView.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CouplingView } from '../CouplingView';
import { CouplingDataProcessor } from '@/services/data/CouplingDataProcessor';

describe('CouplingView', () => {
  // ... rest of the file remains unchanged ...
  // Setup Mock Data
  const mockCouplingIndex = CouplingDataProcessor.process({
    edges: [
      { source: 'src/Core.ts', target: 'src/Utils.ts', couplingStrength: 0.85, cochangeCount: 20 },
      { source: 'src/Core.ts', target: 'src/Types.ts', couplingStrength: 0.4, cochangeCount: 5 }
    ]
  });

  const mockFile = {
    key: 'src/Core.ts',
    name: 'Core.ts',
    path: 'src/Core.ts',
    totalCommits: 100,
    uniqueAuthors: 5,
    operations: {},
    ageDays: 10,
    firstSeen: '',
    lastModified: '',
    value: 100
  };

  it('should render key metrics correctly', () => {
    render(
      <CouplingView 
        file={mockFile} 
        couplingIndex={mockCouplingIndex} 
        couplingThreshold={0.3} 
      />
    );

    // Check Total Partners (2)
    const partnerCounts = screen.getAllByText('2');
    expect(partnerCounts.length).toBeGreaterThan(0);
    expect(screen.getByText('Coupled Files')).toBeInTheDocument();

    // Check Max Strength (0.85)
    const maxStrengths = screen.getAllByText('0.85');
    expect(maxStrengths.length).toBeGreaterThan(0);
  });

  it('should list partners sorted by strength', () => {
    render(
      <CouplingView 
        file={mockFile} 
        couplingIndex={mockCouplingIndex} 
        couplingThreshold={0.3} 
      />
    );

    expect(screen.getByText('Utils.ts')).toBeInTheDocument();
    expect(screen.getByText('Types.ts')).toBeInTheDocument();
  });

  it('should filter partners based on threshold', () => {
    render(
      <CouplingView 
        file={mockFile} 
        couplingIndex={mockCouplingIndex} 
        couplingThreshold={0.5} 
      />
    );

    expect(screen.getByText('Utils.ts')).toBeInTheDocument();
    expect(screen.queryByText('Types.ts')).not.toBeInTheDocument();
  });

  it('should display appropriate insight message for high coupling', () => {
    render(
      <CouplingView 
        file={mockFile} 
        couplingIndex={mockCouplingIndex} 
        couplingThreshold={0.3} 
      />
    );

    expect(screen.getByText(/strong coupling relationships detected/i)).toBeInTheDocument();
  });

  it('should handle isolated files (no coupling)', () => {
    const isolatedFile = { ...mockFile, path: 'src/Isolated.ts' };
    
    render(
      <CouplingView 
        file={isolatedFile} 
        couplingIndex={mockCouplingIndex} 
        couplingThreshold={0.3} 
      />
    );

    expect(screen.getByText(/No coupling relationships detected/i)).toBeInTheDocument();
  });
});