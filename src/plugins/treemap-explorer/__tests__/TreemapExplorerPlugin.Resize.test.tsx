import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TreemapExplorerPlugin } from '../TreemapExplorerPlugin';
import { TreemapExplorerState } from '../types';

// Mock ResizeObserver
const resizeObserverMock = vi.fn();
const observeMock = vi.fn();
const unobserveMock = vi.fn();
const disconnectMock = vi.fn();

class ResizeObserver {
  constructor(callback: any) {
    resizeObserverMock(callback);
  }
  observe = observeMock;
  unobserve = unobserveMock;
  disconnect = disconnectMock;
}
global.ResizeObserver = ResizeObserver as any;

describe('TreemapExplorerPlugin - Resize Behavior', () => {
  let plugin: TreemapExplorerPlugin;
  let container: HTMLElement;
  let state: TreemapExplorerState;

  beforeEach(() => {
    plugin = new TreemapExplorerPlugin();
    container = document.createElement('div');
    // Set initial dimensions
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ width: 800, height: 600, top: 0, left: 0, bottom: 600, right: 800 })
    });
    state = plugin.getInitialState();
    
    // Reset mocks
    resizeObserverMock.mockClear();
    observeMock.mockClear();
    unobserveMock.mockClear();
    disconnectMock.mockClear();
  });

  afterEach(() => {
    plugin.cleanup();
  });

  it('should attach ResizeObserver on init', () => {
    plugin.init(container, state);
    
    // This should fail currently
    expect(resizeObserverMock).toHaveBeenCalled();
    expect(observeMock).toHaveBeenCalledWith(container);
  });

  it('should disconnect ResizeObserver on cleanup', () => {
    plugin.init(container, state);
    plugin.cleanup();
    
    // This should fail currently
    expect(disconnectMock).toHaveBeenCalled();
  });
});