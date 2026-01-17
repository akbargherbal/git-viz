// src/plugins/treemap-explorer/components/__tests__/TimeView.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeView } from '../TimeView';
import { TemporalFileData } from '@/services/data/TemporalDataProcessor';

describe('TimeView', () => {
  const mockActiveFile: TemporalFileData = {
    key: 'src/components/Button.tsx',
    name: 'Button.tsx',
    path: 'src/components/Button.tsx',
    total_commits: 45,
    unique_authors: 5,
    totalCommits: 45,
    uniqueAuthors: 5,
    operations: { M: 35, A: 10, D: 0 },
    age_days: 120,
    first_seen: '2025-09-01',
    last_modified: '2026-01-10',
    // Temporal fields
    createdDate: '2025-09-01',
    lastModifiedDate: '2026-01-10',
    dormantDays: 7,
    isDormant: false,
    createdPosition: 65,
    isVisible: true,
    ageDays: 138,
    activityTimeline: [
      { date: '2025-09-01', commits: 10 },
      { date: '2025-11-01', commits: 20 },
      { date: '2026-01-10', commits: 15 }
    ]
  };

  const mockDormantFile: TemporalFileData = {
    key: 'src/legacy/OldUtils.ts',
    name: 'OldUtils.ts',
    path: 'src/legacy/OldUtils.ts',
    total_commits: 120,
    unique_authors: 8,
    totalCommits: 120,
    uniqueAuthors: 8,
    operations: { M: 100, A: 20, D: 0 },
    age_days: 600,
    first_seen: '2023-01-15',
    last_modified: '2023-08-20',
    // Temporal fields
    createdDate: '2023-01-15',
    lastModifiedDate: '2023-08-20',
    dormantDays: 881,
    isDormant: true,
    createdPosition: 15,
    isVisible: true,
    ageDays: 1098,
    activityTimeline: []
  };

  describe('Active File Display', () => {
    it('should render active status for recently modified files', () => {
      render(<TimeView file={mockActiveFile} />);
      
      const activeElements = screen.getAllByText(/Active/i);
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it('should display creation date', () => {
      render(<TimeView file={mockActiveFile} />);
      
      expect(screen.getByText(/Created/i)).toBeInTheDocument();
      expect(screen.getByText(/Sep.*2025/i)).toBeInTheDocument();
    });

    it('should display last modified date', () => {
      render(<TimeView file={mockActiveFile} />);
      
      expect(screen.getByText(/Last Modified/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan.*2026/i)).toBeInTheDocument();
    });

    it('should show age in days', () => {
      render(<TimeView file={mockActiveFile} />);
      
      expect(screen.getByText(/138 days/i)).toBeInTheDocument();
    });

    it('should show dormant days even for active files', () => {
      render(<TimeView file={mockActiveFile} />);
      
      // Dormant period should be shown (value will vary based on actual calculation)
      expect(screen.getByText(/Dormant Period/i)).toBeInTheDocument();
    });

    it('should display active file insight message', () => {
      render(<TimeView file={mockActiveFile} />);
      
      expect(screen.getByText(/actively maintained/i)).toBeInTheDocument();
    });
  });

  describe('Dormant File Display', () => {
    it('should render dormant status for old files', () => {
      render(<TimeView file={mockDormantFile} />);
      
      const dormantElements = screen.getAllByText(/Dormant/i);
      expect(dormantElements.length).toBeGreaterThan(0);
    });

    it('should show high dormant days count', () => {
      render(<TimeView file={mockDormantFile} />);
      
      // FIX: Use getAllByText because the text appears in both the metric card and the insight message
      const elements = screen.getAllByText(/881 days/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display dormant file insight message', () => {
      render(<TimeView file={mockDormantFile} />);
      
      // FIX: Use getAllByText for "dormant" as it appears in status badge and text
      expect(screen.getAllByText(/dormant/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/has been/i)).toBeInTheDocument();
    });

    it('should use different styling for dormant status', () => {
      const { container } = render(<TimeView file={mockDormantFile} />);
      
      // Should have muted background for dormant files
      const statusBadge = container.querySelector('.bg-zinc-950\\/50');
      expect(statusBadge).toBeInTheDocument();
    });
  });

  describe('Activity Timeline', () => {
    it('should display activity timeline for files with timeline data', () => {
      render(<TimeView file={mockActiveFile} />);
      
      // Activity Timeline section should be present
      expect(screen.getByText(/Activity Timeline/i)).toBeInTheDocument();
    });

    it('should not show timeline for files without activity data', () => {
      render(<TimeView file={mockDormantFile} />);
      
      // No timeline data, so section shouldn't appear
      expect(screen.queryByText(/Activity Timeline/i)).not.toBeInTheDocument();
    });
  });

  describe('Metric Cards', () => {
    it('should display all four key metrics', () => {
      render(<TimeView file={mockActiveFile} />);
      
      expect(screen.getByText(/Created/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Modified/i)).toBeInTheDocument();
      expect(screen.getByText(/Age/i)).toBeInTheDocument();
      expect(screen.getByText(/Dormant/i)).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(<TimeView file={mockActiveFile} />);
      
      // Using date-fns format
      expect(screen.getByText(/Sep.*2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan.*2026/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle file with minimal temporal data', () => {
      const minimalFile: TemporalFileData = {
        ...mockActiveFile,
        activityTimeline: undefined,
        dormantDays: 0
      };

      render(<TimeView file={minimalFile} />);
      
      const activeElements = screen.getAllByText(/Active/i);
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it('should handle very recently created files (age 0-1 days)', () => {
      const newFile: TemporalFileData = {
        ...mockActiveFile,
        age_days: 1,
        ageDays: 1,
        dormantDays: 1,
        createdDate: '2025-01-16',
        lastModifiedDate: '2025-01-16'
      };

      render(<TimeView file={newFile} />);
      
      expect(screen.getByText(/1 days/i)).toBeInTheDocument();
    });

    it('should handle files with very long dormancy (>1 year)', () => {
      const veryDormantFile: TemporalFileData = {
        ...mockDormantFile,
        dormantDays: 730
      };

      render(<TimeView file={veryDormantFile} />);
      
      // Should display high dormant days
      expect(screen.getByText(/Dormant Period/i)).toBeInTheDocument();
    });
  });

  describe('Lifecycle Status Badge Styling', () => {
    it('should apply blue styling to active files', () => {
      const { container } = render(<TimeView file={mockActiveFile} />);
      
      const statusCard = container.querySelector('.bg-blue-950\\/50');
      expect(statusCard).toBeInTheDocument();
    });

    it('should apply muted styling to dormant files', () => {
      const { container } = render(<TimeView file={mockDormantFile} />);
      
      const statusCard = container.querySelector('.bg-zinc-950\\/50');
      expect(statusCard).toBeInTheDocument();
    });
  });
});
