import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { FilterPanel } from '../FilterPanel';
import { useAppStore } from '@/store/appStore';

// Mock the store
vi.mock('@/store/appStore', () => ({
  useAppStore: vi.fn(),
}));

describe('FilterPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Controlled Mode', () => {
    const mockAuthors = [
      { value: 'alice', label: 'Alice', count: 100 },
      { value: 'bob', label: 'Bob', count: 50 },
      { value: 'charlie', label: 'Charlie', count: 25 },
      { value: 'dave', label: 'Dave', count: 10 },
      { value: 'eve', label: 'Eve', count: 5 },
      { value: 'frank', label: 'Frank', count: 2 }, // 6th author
    ];

    const mockExtensions = [
      { extension: 'ts', count: 50 },
      { extension: 'tsx', count: 30 },
    ];

    const defaultProps = {
      authors: mockAuthors,
      extensions: mockExtensions,
      selectedAuthors: [],
      selectedExtensions: [],
      onAuthorsChange: vi.fn(),
      onExtensionsChange: vi.fn(),
      onClose: mockOnClose,
    };

    it('should render authors and extensions', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('ts')).toBeInTheDocument();
    });

    it('should handle author selection', () => {
      render(<FilterPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('Alice'));
      expect(defaultProps.onAuthorsChange).toHaveBeenCalledWith(['Alice']);
    });

    it('should handle extension selection', () => {
      render(<FilterPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('ts'));
      expect(defaultProps.onExtensionsChange).toHaveBeenCalledWith(['ts']);
    });

    it('should filter authors via search', () => {
      render(<FilterPanel {...defaultProps} />);

      const searchInput = screen.getByTestId('author-search');
      fireEvent.change(searchInput, { target: { value: 'Bob' } });

      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('should show top 5 authors by default and expand on click', () => {
      render(<FilterPanel {...defaultProps} />);

      // Frank is 6th, should not be visible initially
      expect(screen.queryByText('Frank')).not.toBeInTheDocument();

      // Find expand button (text varies based on state)
      const expandButton = screen.getByText(/Show All 6 Authors/);
      fireEvent.click(expandButton);

      expect(screen.getByText('Frank')).toBeInTheDocument();
    });

    it('should reset filters', () => {
      const props = {
        ...defaultProps,
        selectedAuthors: ['Alice'],
        selectedExtensions: ['ts'],
      };

      render(<FilterPanel {...props} />);

      const resetButton = screen.getByTestId('reset-filters');
      fireEvent.click(resetButton);

      expect(props.onAuthorsChange).toHaveBeenCalledWith([]);
      expect(props.onExtensionsChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Uncontrolled Mode', () => {
    const mockMetadata = {
      authors: [
        { name: 'Alice', email: 'alice@test.com', commit_count: 100 },
        { name: 'Bob', email: 'bob@test.com', commit_count: 50 },
      ],
      file_types: [
        { extension: 'ts', count: 50 },
      ],
      // Add other required fields for RepoMetadata if strict, but component only uses these
    } as any;

    const mockStore = {
      filters: {
        authors: new Set(),
        fileTypes: new Set(),
      },
      toggleAuthor: vi.fn(),
      toggleFileType: vi.fn(),
      clearFilters: vi.fn(),
    };

    beforeEach(() => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    });

    it('should render using metadata prop', () => {
      render(<FilterPanel metadata={mockMetadata} onClose={mockOnClose} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('ts')).toBeInTheDocument();
    });

    it('should use store actions for toggling', () => {
      render(<FilterPanel metadata={mockMetadata} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Alice'));
      expect(mockStore.toggleAuthor).toHaveBeenCalledWith('Alice');

      fireEvent.click(screen.getByText('ts'));
      expect(mockStore.toggleFileType).toHaveBeenCalledWith('ts');
    });

    it('should reflect store selection state', () => {
      const selectedStore = {
        ...mockStore,
        filters: {
          authors: new Set(['Alice']),
          fileTypes: new Set(['ts']),
        },
      };
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(selectedStore);

      render(<FilterPanel metadata={mockMetadata} onClose={mockOnClose} />);

      // Check for selected styling (e.g., check class or specific element state)
      // The component uses conditional classes.
      // Alice should have "text-white" class (selected) vs "text-zinc-300" (unselected)
      const aliceName = screen.getByText('Alice');
      expect(aliceName).toHaveClass('text-white');

      const bobName = screen.getByText('Bob');
      expect(bobName).toHaveClass('text-zinc-300');
    });

    it('should clear filters via store', () => {
      const selectedStore = {
        ...mockStore,
        filters: {
          authors: new Set(['Alice']),
          fileTypes: new Set(),
        },
      };
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(selectedStore);

      render(<FilterPanel metadata={mockMetadata} onClose={mockOnClose} />);

      const resetButton = screen.getByTestId('reset-filters');
      fireEvent.click(resetButton);

      expect(mockStore.clearFilters).toHaveBeenCalled();
    });

    it('should not render if metadata is null', () => {
      const { container } = render(<FilterPanel metadata={null} onClose={mockOnClose} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
