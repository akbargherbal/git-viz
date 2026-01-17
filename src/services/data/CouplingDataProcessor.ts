// src/services/data/CouplingDataProcessor.ts

import { EnrichedFileData } from "@/plugins/treemap-explorer/types";

/**
 * Processes co-change network data to extract coupling relationships between files
 * Used by Treemap Explorer plugin in Coupling Lens mode
 */

export interface CouplingEdge {
  source: string;
  target: string;
  cochangeCount: number;
  couplingStrength: number; // 0-1
}

export interface CouplingPartner {
  filePath: string;
  strength: number;
  cochangeCount: number;
}

export interface FileCouplingData {
  filePath: string;
  partners: CouplingPartner[];
  maxStrength: number;
  avgStrength: number;
  totalPartners: number;
}

export interface CouplingNetworkData {
  schemaVersion: string;
  networkType: string;
  totalFiles: number;
  totalEdges: number;
  edges: CouplingEdge[];
}

/**
 * Index mapping file paths to their coupling relationships
 */
export type CouplingIndex = Map<string, FileCouplingData>;

export class CouplingDataProcessor {
  /**
   * Enrich files with coupling data
   */
  static enrichWithCoupling(files: EnrichedFileData[], networkData: any): void {
    if (!networkData || !networkData.edges) return;

    const index = this.process(networkData);

    files.forEach((file) => {
      const couplingData = index.get(file.key);
      if (couplingData) {
        file.couplingMetrics = {
          maxStrength: couplingData.maxStrength,
          avgStrength: couplingData.avgStrength,
          totalPartners: couplingData.totalPartners,
          strongCouplings: couplingData.partners.filter((p) => p.strength > 0.5)
            .length,
        };
        file.maxCoupling = couplingData.maxStrength;
        file.coupledFiles = couplingData.partners.map((p) => ({
          file: p.filePath,
          strength: p.strength,
          cochangeCount: p.cochangeCount,
        }));
      } else {
        file.couplingMetrics = {
          maxStrength: 0,
          avgStrength: 0,
          totalPartners: 0,
          strongCouplings: 0,
        };
        file.maxCoupling = 0;
        file.coupledFiles = [];
      }
    });
  }

  /**
   * Process raw cochange network data into an efficient coupling index
   */
  static process(rawData: any): CouplingIndex {
    if (!rawData || !rawData.edges) {
      console.warn(
        "CouplingDataProcessor: Invalid or missing cochange_network data",
      );
      return new Map();
    }

    const edges: CouplingEdge[] = rawData.edges;
    const couplingMap = new Map<string, CouplingPartner[]>();

    // Build bidirectional coupling map
    edges.forEach((edge: CouplingEdge) => {
      const { source, target, cochangeCount, couplingStrength } = edge;

      // Add forward edge (source -> target)
      if (!couplingMap.has(source)) {
        couplingMap.set(source, []);
      }
      couplingMap.get(source)!.push({
        filePath: target,
        strength: couplingStrength,
        cochangeCount,
      });

      // Add reverse edge (target -> source) for bidirectional navigation
      if (!couplingMap.has(target)) {
        couplingMap.set(target, []);
      }
      couplingMap.get(target)!.push({
        filePath: source,
        strength: couplingStrength,
        cochangeCount,
      });
    });

    // Convert to CouplingIndex with computed metrics
    const index: CouplingIndex = new Map();

    couplingMap.forEach((partners, filePath) => {
      // Sort partners by strength descending
      const sortedPartners = partners.sort((a, b) => b.strength - a.strength);

      // Calculate aggregate metrics
      const maxStrength =
        sortedPartners.length > 0 ? sortedPartners[0].strength : 0;

      const avgStrength =
        sortedPartners.length > 0
          ? sortedPartners.reduce((sum, p) => sum + p.strength, 0) /
            sortedPartners.length
          : 0;

      index.set(filePath, {
        filePath,
        partners: sortedPartners,
        maxStrength,
        avgStrength,
        totalPartners: sortedPartners.length,
      });
    });

    return index;
  }

  /**
   * Get coupling partners for a specific file, filtered by minimum strength threshold
   */
  static getFileCouplings(
    couplingIndex: CouplingIndex,
    filePath: string,
    minStrength: number = 0.0,
  ): CouplingPartner[] {
    const fileData = couplingIndex.get(filePath);
    if (!fileData) return [];

    return fileData.partners.filter((p) => p.strength >= minStrength);
  }

  /**
   * Get top N coupling partners for a file
   */
  static getTopCouplings(
    couplingIndex: CouplingIndex,
    filePath: string,
    topN: number = 10,
  ): CouplingPartner[] {
    const fileData = couplingIndex.get(filePath);
    if (!fileData) return [];

    return fileData.partners.slice(0, topN);
  }

  /**
   * Check if a file has strong coupling (any partner above threshold)
   */
  static hasStrongCoupling(
    couplingIndex: CouplingIndex,
    filePath: string,
    threshold: number = 0.5,
  ): boolean {
    const fileData = couplingIndex.get(filePath);
    if (!fileData) return false;

    return fileData.maxStrength >= threshold;
  }

  /**
   * Get coupling metrics for a file
   */
  static getFileCouplingMetrics(
    couplingIndex: CouplingIndex,
    filePath: string,
  ): {
    maxStrength: number;
    avgStrength: number;
    totalPartners: number;
    strongCouplings: number; // partners with strength > 0.5
  } {
    const fileData = couplingIndex.get(filePath);

    if (!fileData) {
      return {
        maxStrength: 0,
        avgStrength: 0,
        totalPartners: 0,
        strongCouplings: 0,
      };
    }

    const strongCouplings = fileData.partners.filter(
      (p) => p.strength > 0.5,
    ).length;

    return {
      maxStrength: fileData.maxStrength,
      avgStrength: fileData.avgStrength,
      totalPartners: fileData.totalPartners,
      strongCouplings,
    };
  }

  /**
   * Filter files by coupling criteria
   */
  static filterFilesByCoupling(
    couplingIndex: CouplingIndex,
    filePaths: string[],
    options: {
      minMaxStrength?: number;
      minAvgStrength?: number;
      minPartners?: number;
    } = {},
  ): string[] {
    const { minMaxStrength = 0, minAvgStrength = 0, minPartners = 0 } = options;

    return filePaths.filter((path) => {
      const fileData = couplingIndex.get(path);
      if (!fileData) return false;

      return (
        fileData.maxStrength >= minMaxStrength &&
        fileData.avgStrength >= minAvgStrength &&
        fileData.totalPartners >= minPartners
      );
    });
  }

  /**
   * Get statistics about the coupling network
   */
  static getNetworkStats(couplingIndex: CouplingIndex): {
    totalFiles: number;
    totalEdges: number;
    avgPartnersPerFile: number;
    maxPartnersPerFile: number;
    stronglyCoupledFiles: number; // files with max strength > 0.5
  } {
    const allFiles = Array.from(couplingIndex.values());

    if (allFiles.length === 0) {
      return {
        totalFiles: 0,
        totalEdges: 0,
        avgPartnersPerFile: 0,
        maxPartnersPerFile: 0,
        stronglyCoupledFiles: 0,
      };
    }

    const totalEdges = allFiles.reduce((sum, f) => sum + f.totalPartners, 0);
    const avgPartnersPerFile = totalEdges / allFiles.length;
    const maxPartnersPerFile = Math.max(
      ...allFiles.map((f) => f.totalPartners),
    );
    const stronglyCoupledFiles = allFiles.filter(
      (f) => f.maxStrength > 0.5,
    ).length;

    return {
      totalFiles: allFiles.length,
      totalEdges,
      avgPartnersPerFile,
      maxPartnersPerFile,
      stronglyCoupledFiles,
    };
  }
}
