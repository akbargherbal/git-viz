// src/utils/colorScales.ts

import * as d3 from 'd3';

/**
 * Color scale utilities for visualizations
 */

export type ColorScheme = 'viridis' | 'plasma' | 'warm' | 'cool' | 'spectral';

export const getColorScale = (scheme: ColorScheme, domain: [number, number]) => {
  let interpolator;
  
  switch (scheme) {
    case 'viridis':
      interpolator = d3.interpolateViridis;
      break;
    case 'plasma':
      interpolator = d3.interpolatePlasma;
      break;
    case 'warm':
      interpolator = d3.interpolateWarm;
      break;
    case 'cool':
      interpolator = d3.interpolateCool;
      break;
    case 'spectral':
      interpolator = d3.interpolateSpectral;
      break;
    default:
      interpolator = d3.interpolateViridis;
  }
  
  return d3.scaleSequential(interpolator).domain(domain);
};

export const getDiscreteColorScale = (categories: string[]) => {
  return d3.scaleOrdinal(d3.schemeCategory10).domain(categories);
};

export const getHeatmapColor = (value: number, maxValue: number, minValue: number = 0): string => {
  if (value === 0 || maxValue === 0) return '#1a1a2e';
  
  const normalized = (value - minValue) / (maxValue - minValue);
  const hue = 270 - normalized * 150; // Purple to yellow
  const saturation = 70 + normalized * 30;
  const lightness = 20 + normalized * 60;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const getTreemapColor = (
  value: number, 
  maxValue: number, 
  minValue: number = 0,
  type: 'frequency' | 'age' | 'size' = 'frequency'
): string => {
  if (maxValue === 0) return '#1a1a2e';
  
  const normalized = (value - minValue) / (maxValue - minValue);
  
  switch (type) {
    case 'frequency':
      // Blue to red (cold to hot)
      const freqHue = 240 - normalized * 240;
      return `hsl(${freqHue}, 70%, 50%)`;
    
    case 'age':
      // Green (new) to brown (old)
      const ageHue = 120 - normalized * 80;
      return `hsl(${ageHue}, 60%, 45%)`;
    
    case 'size':
      // Light to dark
      const lightness = 70 - normalized * 50;
      return `hsl(220, 60%, ${lightness}%)`;
    
    default:
      return getHeatmapColor(value, maxValue, minValue);
  }
};

export const interpolateColor = (color1: string, color2: string, t: number): string => {
  const interpolator = d3.interpolateRgb(color1, color2);
  return interpolator(t);
};
