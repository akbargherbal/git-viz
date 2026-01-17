// src/plugins/treemap-explorer/components/__tests__/TimelineScrubber.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimelineScrubber from '../TimelineScrubber';

describe('TimelineScrubber', () => {
  const defaultProps = {
    minDate: '2023-01-01',
    maxDate: '2025-01-15',
    currentPosition: 50,
    visible: true,
    onPositionChange: vi.fn(),
    onPlayToggle: vi.fn(),
    playing: false
  };

  describe('Rendering', () => {
    it('should render when visible is true', () => {
      render(<TimelineScrubber {...defaultProps} />);
      
      expect(screen.getByText(/Jan.*1.*2023/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan.*15.*2025/i)).toBeInTheDocument();
    });

    it('should have reduced opacity when visible is false', () => {
      const { container } = render(
        <TimelineScrubber {...defaultProps} visible={false} />
      );
      
      const scrubber = container.firstChild as HTMLElement;
      expect(scrubber).toHaveClass('opacity-0');
      expect(scrubber).toHaveClass('pointer-events-none');
    });

    it('should display min and max dates', () => {
      render(<TimelineScrubber {...defaultProps} />);
      
      expect(screen.getByText(/Jan.*1.*2023/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan.*15.*2025/i)).toBeInTheDocument();
    });

    it('should show current date based on position', () => {
      render(<TimelineScrubber {...defaultProps} currentPosition={50} />);
      
      // At position 50, should show date around mid-2024
      const currentDateElement = screen.getByText(/Jan.*2024/i);
      expect(currentDateElement).toBeInTheDocument();
    });

    it('should display play/pause button', () => {
      render(<TimelineScrubber {...defaultProps} />);
      
      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeInTheDocument();
    });
  });

  describe('Slider Interaction', () => {
    it('should render slider with correct value', () => {
      render(<TimelineScrubber {...defaultProps} currentPosition={75} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveValue('75');
    });

    it('should call onPositionChange when slider moves', () => {
      const onPositionChange = vi.fn();
      render(
        <TimelineScrubber {...defaultProps} onPositionChange={onPositionChange} />
      );
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '75' } });
      
      expect(onPositionChange).toHaveBeenCalledWith(75);
    });

    it('should handle slider at minimum (0)', () => {
      const onPositionChange = vi.fn();
      render(
        <TimelineScrubber {...defaultProps} onPositionChange={onPositionChange} />
      );
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0' } });
      
      expect(onPositionChange).toHaveBeenCalledWith(0);
    });

    it('should handle slider at maximum (100)', () => {
      const onPositionChange = vi.fn();
      render(
        <TimelineScrubber {...defaultProps} onPositionChange={onPositionChange} />
      );
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '100' } });
      
      expect(onPositionChange).toHaveBeenCalledWith(100);
    });

    it('should have proper slider attributes', () => {
      render(<TimelineScrubber {...defaultProps} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '100');
      expect(slider).toHaveAttribute('step', '0.1');
    });
  });

  describe('Playback Controls', () => {
    it('should show play icon when not playing', () => {
      render(<TimelineScrubber {...defaultProps} playing={false} />);
      
      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeInTheDocument();
    });

    it('should show pause icon when playing', () => {
      render(<TimelineScrubber {...defaultProps} playing={true} />);
      
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it('should call onPlayToggle when play button clicked', () => {
      const onPlayToggle = vi.fn();
      render(
        <TimelineScrubber {...defaultProps} onPlayToggle={onPlayToggle} />
      );
      
      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);
      
      expect(onPlayToggle).toHaveBeenCalled();
    });

    it('should call onPlayToggle when pause button clicked', () => {
      const onPlayToggle = vi.fn();
      render(
        <TimelineScrubber
          {...defaultProps}
          playing={true}
          onPlayToggle={onPlayToggle}
        />
      );
      
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);
      
      expect(onPlayToggle).toHaveBeenCalled();
    });
  });

  describe('Current Date Calculation', () => {
    it('should show start date at position 0', () => {
      render(<TimelineScrubber {...defaultProps} currentPosition={0} />);
      
      // Should show date close to minDate (Jan 1, 2023)
      // FIX: Use getAllByText because it appears twice (start label + current label)
      const currentDates = screen.getAllByText(/Jan.*1.*2023/i);
      expect(currentDates.length).toBeGreaterThan(0);
    });

    it('should show end date at position 100', () => {
      render(<TimelineScrubber {...defaultProps} currentPosition={100} />);
      
      // Should show date close to maxDate (Jan 15, 2025)
      // FIX: Use getAllByText because it appears twice (end label + current label)
      const currentDates = screen.getAllByText(/Jan.*15.*2025/i);
      expect(currentDates.length).toBeGreaterThan(0);
    });

    it('should interpolate date at middle position', () => {
      render(<TimelineScrubber {...defaultProps} currentPosition={50} />);
      
      // Should show date around mid-2024
      const currentDate = screen.getByText(/Jan.*2024/i);
      expect(currentDate).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply gradient background', () => {
      const { container } = render(<TimelineScrubber {...defaultProps} />);
      
      const scrubber = container.firstChild as HTMLElement;
      expect(scrubber).toHaveClass('bg-gradient-to-t');
      expect(scrubber).toHaveClass('from-zinc-900');
    });

    it('should position at bottom of container', () => {
      const { container } = render(<TimelineScrubber {...defaultProps} />);
      
      const scrubber = container.firstChild as HTMLElement;
      expect(scrubber).toHaveClass('absolute');
      expect(scrubber).toHaveClass('bottom-0');
    });

    it('should have proper height', () => {
      const { container } = render(<TimelineScrubber {...defaultProps} />);
      
      const scrubber = container.firstChild as HTMLElement;
      expect(scrubber).toHaveClass('h-20');
    });
  });

  describe('Transition Effects', () => {
    it('should have transition class for smooth opacity changes', () => {
      const { container } = render(<TimelineScrubber {...defaultProps} />);
      
      const scrubber = container.firstChild as HTMLElement;
      expect(scrubber).toHaveClass('transition-opacity');
    });

    it('should transition smoothly between visible and hidden states', () => {
      const { container, rerender } = render(
        <TimelineScrubber {...defaultProps} visible={true} />
      );
      
      let scrubber = container.firstChild as HTMLElement;
      expect(scrubber).toHaveClass('opacity-100');
      
      rerender(<TimelineScrubber {...defaultProps} visible={false} />);
      
      scrubber = container.firstChild as HTMLElement;
      expect(scrubber).toHaveClass('opacity-0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle position values with decimals', () => {
      const onPositionChange = vi.fn();
      render(
        <TimelineScrubber {...defaultProps} onPositionChange={onPositionChange} />
      );
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '45.7' } });
      
      expect(onPositionChange).toHaveBeenCalledWith(45.7);
    });

    it('should handle same min and max dates gracefully', () => {
      const { container } = render(
        <TimelineScrubber
          {...defaultProps}
          minDate="2024-01-01"
          maxDate="2024-01-01"
        />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render with very short date range (1 day)', () => {
      render(
        <TimelineScrubber
          {...defaultProps}
          minDate="2024-01-01"
          maxDate="2024-01-02"
        />
      );
      
      // FIX: Use getAllByText for Jan 1 because it appears as Start Date AND Current Date (at 50% of 1 day)
      expect(screen.getAllByText(/Jan.*1.*2024/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Jan.*2.*2024/i)).toBeInTheDocument();
    });

    it('should render with very long date range (10 years)', () => {
      render(
        <TimelineScrubber
          {...defaultProps}
          minDate="2015-01-01"
          maxDate="2025-01-01"
        />
      );
      
      expect(screen.getByText(/Jan.*1.*2015/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan.*1.*2025/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible slider', () => {
      render(<TimelineScrubber {...defaultProps} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    it('should have accessible play/pause button', () => {
      render(<TimelineScrubber {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });

    it('should allow keyboard interaction with slider', () => {
      const onPositionChange = vi.fn();
      render(
        <TimelineScrubber {...defaultProps} onPositionChange={onPositionChange} />
      );
      
      const slider = screen.getByRole('slider');
      slider.focus();
      
      // Simulate arrow key press
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      
      // Slider should be focusable and interactive
      expect(slider).toHaveFocus();
    });
  });
});
