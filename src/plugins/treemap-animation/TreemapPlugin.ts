// src/plugins/treemap-animation/TreemapPlugin.ts

import * as d3 from 'd3';
import { treemap as d3Treemap, hierarchy } from 'd3-hierarchy';
import { VisualizationPlugin, RawDataset } from '@/types/plugin';
import { TreemapConfig, TreemapData, TreemapNode, TreemapSnapshot } from '@/types/visualization';
import { FileSummary } from '@/types/domain';
import { getTreemapColor } from '@/utils/colorScales';
import { startOfMonth, startOfQuarter, startOfYear, addMonths, addQuarters, addYears } from 'date-fns';

/**
 * Treemap Animation Visualization Plugin
 * Shows animated repository structure evolution over time
 */

export class TreemapPlugin implements VisualizationPlugin<TreemapConfig, TreemapData> {
  metadata = {
    id: 'treemap-animation',
    name: 'Treemap Animation',
    description: 'Animated view of repository structure evolution',
    version: '1.0.0',
    priority: 2,
  };
  
  defaultConfig: TreemapConfig = {
    snapshots: 'quarterly',
    sizeMetric: 'events',
    colorMetric: 'changeFrequency',
    showLabels: true,
    minNodeSize: 1000,
    animationDuration: 1000,
  };
  
  private container: HTMLElement | null = null;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private currentSnapshot = 0;
  private animationFrame: number | null = null;
  
  init(container: HTMLElement, config: TreemapConfig): void {
    this.container = container;
    this.container.innerHTML = '';
    
    // Create SVG
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('background', '#09090b');
  }
  
  processData(dataset: RawDataset): TreemapData {
    const { events, summary } = dataset;
    
    if (events.length === 0) {
      return {
        snapshots: [],
        currentIndex: 0,
      };
    }
    
    // Get time range
    const dates = events.map(e => e.commit_datetime);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Generate snapshots based on config
    const snapshots = this.generateSnapshots(
      events,
      summary,
      minDate,
      maxDate,
      this.defaultConfig.snapshots
    );
    
    return {
      snapshots,
      currentIndex: 0,
    };
  }
  
  private generateSnapshots(
    events: any[],
    summary: FileSummary[],
    startDate: Date,
    endDate: Date,
    frequency: 'monthly' | 'quarterly' | 'yearly'
  ): TreemapSnapshot[] {
    const snapshots: TreemapSnapshot[] = [];
    
    let current = frequency === 'monthly' ? startOfMonth(startDate) :
                  frequency === 'quarterly' ? startOfQuarter(startDate) :
                  startOfYear(startDate);
    
    const end = frequency === 'monthly' ? startOfMonth(endDate) :
                frequency === 'quarterly' ? startOfQuarter(endDate) :
                startOfYear(endDate);
    
    while (current <= end) {
      const label = this.getSnapshotLabel(current, frequency);
      
      // Filter events up to this point
      const eventsUpToNow = events.filter(e => e.commit_datetime <= current);
      
      // Build tree for this snapshot
      const root = this.buildTreemapHierarchy(eventsUpToNow, summary);
      
      snapshots.push({
        timestamp: new Date(current),
        label,
        root,
      });
      
      // Advance to next period
      current = frequency === 'monthly' ? addMonths(current, 1) :
                frequency === 'quarterly' ? addQuarters(current, 1) :
                addYears(current, 1);
    }
    
    return snapshots;
  }
  
  private getSnapshotLabel(date: Date, frequency: string): string {
    if (frequency === 'monthly') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } else if (frequency === 'quarterly') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    } else {
      return date.getFullYear().toString();
    }
  }
  
  private buildTreemapHierarchy(events: any[], summary: FileSummary[]): TreemapNode {
    // Build directory structure with aggregated metrics
    const fileMap = new Map<string, { events: number; authors: Set<string> }>();
    
    events.forEach(e => {
      if (!fileMap.has(e.file_path)) {
        fileMap.set(e.file_path, { events: 0, authors: new Set() });
      }
      const file = fileMap.get(e.file_path)!;
      file.events++;
      file.authors.add(e.author_name);
    });
    
    // Build tree structure
    const root: TreemapNode = {
      name: 'root',
      path: '',
      value: 0,
      changeFrequency: 0,
      children: [],
      level: 0,
      isDirectory: true,
    };
    
    const dirMap = new Map<string, TreemapNode>();
    dirMap.set('', root);
    
    // Process each file
    Array.from(fileMap.entries()).forEach(([filepath, data]) => {
      const parts = filepath.split('/').filter(p => p);
      let currentPath = '';
      
      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLastPart = index === parts.length - 1;
        
        if (!dirMap.has(currentPath)) {
          const node: TreemapNode = {
            name: part,
            path: currentPath,
            value: 0,
            changeFrequency: 0,
            children: isLastPart ? undefined : [],
            level: index + 1,
            isDirectory: !isLastPart,
            totalEvents: 0,
            uniqueAuthors: 0,
          };
          
          dirMap.set(currentPath, node);
          
          const parent = dirMap.get(parentPath)!;
          parent.children?.push(node);
        }
        
        // Add metrics to leaf node
        if (isLastPart) {
          const node = dirMap.get(currentPath)!;
          node.value = data.events;
          node.changeFrequency = data.events;
          node.uniqueAuthors = data.authors.size;
        }
      });
    });
    
    // Aggregate values up the tree
    const aggregateValues = (node: TreemapNode): number => {
      if (!node.children || node.children.length === 0) {
        return node.value;
      }
      
      node.value = node.children.reduce((sum, child) => sum + aggregateValues(child), 0);
      node.changeFrequency = node.children.reduce((sum, child) => sum + (child.changeFrequency || 0), 0);
      return node.value;
    };
    
    aggregateValues(root);
    
    return root;
  }
  
  render(data: TreemapData, config: TreemapConfig): void {
    if (!this.svg || !this.container || data.snapshots.length === 0) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight - 60; // Leave space for controls
    
    this.svg.selectAll('*').remove();
    
    const mainG = this.svg.append('g')
      .attr('transform', `translate(0, 40)`);
    
    // Render current snapshot
    this.renderSnapshot(data.snapshots[data.currentIndex], mainG, width, height, config);
    
    // Add title
    this.svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text(data.snapshots[data.currentIndex].label);
  }
  
  private renderSnapshot(
    snapshot: TreemapSnapshot,
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    config: TreemapConfig
  ): void {
    // Create treemap layout
    const treemapLayout = d3Treemap<TreemapNode>()
      .size([width, height])
      .padding(1)
      .round(true);
    
    // Create hierarchy
    const root = hierarchy(snapshot.root)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    
    // Compute layout
    treemapLayout(root);
    
    // Find max change frequency for color scale
    const maxFrequency = Math.max(...this.collectValues(snapshot.root, 'changeFrequency'), 1);
    
    // Draw rectangles
    const leaves = root.leaves();
    
    const cell = g.selectAll('g')
      .data(leaves)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);
    
    cell.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const node = d.data as unknown as TreemapNode;
        return getTreemapColor(node.changeFrequency, maxFrequency, 0, 'frequency');
      })
      .attr('stroke', '#27272a')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function() {
        d3.select(this)
          .attr('stroke', '#fbbf24')
          .attr('stroke-width', 2);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('stroke', '#27272a')
          .attr('stroke-width', 1);
      });
    
    // Add labels for larger cells
    if (config.showLabels) {
      cell.filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30)
        .append('text')
        .attr('x', 4)
        .attr('y', 14)
        .attr('fill', '#fff')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text(d => {
          const node = d.data as unknown as TreemapNode;
          const maxLength = Math.floor((d.x1 - d.x0) / 6);
          return node.name.length > maxLength ? 
            node.name.substring(0, maxLength - 3) + '...' : 
            node.name;
        });
    }
  }
  
  private collectValues(node: TreemapNode, key: keyof TreemapNode): number[] {
    const values: number[] = [];
    
    const traverse = (n: TreemapNode) => {
      if (typeof n[key] === 'number') {
        values.push(n[key] as number);
      }
      n.children?.forEach(traverse);
    };
    
    traverse(node);
    return values;
  }
  
  update(data: TreemapData, config: TreemapConfig): void {
    this.render(data, config);
  }
  
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }
  
  async exportImage(): Promise<Blob> {
    if (!this.svg) {
      throw new Error('No visualization to export');
    }
    
    const svgNode = this.svg.node();
    if (!svgNode) {
      throw new Error('SVG node not found');
    }
    
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgNode);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    
    return blob;
  }
  
  exportData(): any {
    return {
      plugin: this.metadata.id,
      exportedAt: new Date().toISOString(),
    };
  }
}
