// src/services/data/DataLoader.ts

import { OptimizedDataset } from "@/types/plugin";
import {
  RepoMetadata,
  OptimizedDirectoryNode,
  ActivityMatrixItem,
} from "@/types/domain";
import { format } from "date-fns";

export interface LoadProgress {
  loaded: number;
  total: number;
  phase: "metadata" | "tree" | "activity" | "complete";
}

// --- Raw Data Interfaces (Matching your new dataset) ---

interface RawLifecycleData {
  analyzed_at: string;
  repository: string;
  total_files: number;
  total_commits: number;
  total_changes: number;
  files: Record<string, RawFileEvent[]>;
}

interface RawFileEvent {
  commit: string;
  timestamp: number;
  datetime: string;
  operation: "A" | "M" | "D" | "R";
  author: string;
  author_email: string;
  subject: string;
}

interface RawAuthorActivity {
  authors: Array<{
    author: string;
    email: string;
    unique_commits: number;
    files_touched: number;
    total_changes: number;
  }>;
}

interface RawFileTypeStats {
  file_types: Array<{
    extension: string;
    count: number;
    total_changes: number;
  }>;
}

export class DataLoader {
  private static instance: DataLoader;

  private constructor() {}

  static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  private async fetchJson<T>(url: string, name: string): Promise<T> {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `Failed to load ${name}: ${res.status} ${res.statusText}`
      );
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error(
        `Failed to load ${name}: Server returned HTML instead of JSON. \n` +
          `Ensure the file exists in the 'public/' directory.`
      );
    }

    return res.json() as Promise<T>;
  }

  /**
   * Load the raw datasets and adapt them to the OptimizedDataset format
   */
  async loadOptimizedDataset(
    baseUrl: string = "/DATASETS_excalidraw",
    onProgress?: (progress: LoadProgress) => void
  ): Promise<OptimizedDataset> {
    const startTime = performance.now();

    try {
      // 1. Load Raw Files in Parallel
      if (onProgress) onProgress({ loaded: 0, total: 3, phase: "metadata" });

      const [lifecycleData, authorData, fileTypeData] = await Promise.all([
        this.fetchJson<RawLifecycleData>(
          `${baseUrl}/file_lifecycle.json`,
          "File Lifecycle"
        ),
        this.fetchJson<RawAuthorActivity>(
          `${baseUrl}/author_activity.json`,
          "Author Activity"
        ),
        this.fetchJson<RawFileTypeStats>(
          `${baseUrl}/file_type_stats.json`,
          "File Types"
        ),
      ]);

      // 2. Transform Data
      if (onProgress) onProgress({ loaded: 1, total: 3, phase: "tree" });

      const dataset = this.processRawData(
        lifecycleData,
        authorData,
        fileTypeData
      );

      const totalTime = performance.now() - startTime;
      console.log(
        `🎉 Dataset loaded and adapted in ${(totalTime / 1000).toFixed(2)}s`
      );

      if (onProgress) onProgress({ loaded: 3, total: 3, phase: "complete" });

      return dataset;
    } catch (error) {
      console.error("Error loading dataset:", error);
      throw error;
    }
  }

  private processRawData(
    lifecycle: RawLifecycleData,
    authors: RawAuthorActivity,
    fileTypes: RawFileTypeStats
  ): OptimizedDataset {
    // --- 1. Build Metadata ---
    const allTimestamps = Object.values(lifecycle.files)
      .flat()
      .map((e) => e.timestamp * 1000);

    const minTime = Math.min(...allTimestamps);
    const maxTime = Math.max(...allTimestamps);

    const metadata: RepoMetadata = {
      repository_name: lifecycle.repository.split("/").pop() || "Repository",
      generation_date: lifecycle.analyzed_at,
      date_range: {
        start: new Date(minTime).toISOString(),
        end: new Date(maxTime).toISOString(),
      },
      stats: {
        total_commits: lifecycle.total_commits,
        total_files: lifecycle.total_files,
        total_authors: authors.authors.length,
      },
      authors: authors.authors.map((a) => ({
        name: a.author,
        email: a.email,
        commit_count: a.unique_commits,
      })),
      file_types: fileTypes.file_types.map((f) => ({
        extension: f.extension,
        count: f.count,
      })),
    };

    // --- 2. Build Directory Tree & Assign IDs ---
    let nodeIdCounter = 1;
    const root: OptimizedDirectoryNode = {
      id: 0,
      name: "root",
      path: "",
      type: "directory",
      children: [],
    };

    // Map to quickly find directory nodes by path for activity aggregation
    const dirPathToId = new Map<string, number>();
    dirPathToId.set("", 0);

    // Helper to get or create directory node
    const getOrCreateDir = (
      pathParts: string[],
      parent: OptimizedDirectoryNode
    ): OptimizedDirectoryNode => {
      if (pathParts.length === 0) return parent;

      const currentName = pathParts[0];
      const remainingParts = pathParts.slice(1);

      let child = parent.children?.find(
        (c) => c.name === currentName && c.type === "directory"
      );

      if (!child) {
        const currentPath = parent.path
          ? `${parent.path}/${currentName}`
          : currentName;
        child = {
          id: nodeIdCounter++,
          name: currentName,
          path: currentPath,
          type: "directory",
          children: [],
        };
        if (!parent.children) parent.children = [];
        parent.children.push(child);
        dirPathToId.set(currentPath, child.id);
      }

      return getOrCreateDir(remainingParts, child);
    };

    // Build tree from file paths
    Object.keys(lifecycle.files).forEach((filePath) => {
      const parts = filePath.split("/");
      const fileName = parts.pop()!;
      const dirParts = parts;

      const dirNode = getOrCreateDir(dirParts, root);

      // Add file node
      if (!dirNode.children) dirNode.children = [];
      dirNode.children.push({
        id: nodeIdCounter++,
        name: fileName,
        path: filePath,
        type: "file",
      });
    });

    // --- 3. Aggregate Activity ---
    // Map key: "YYYY-MM-DD_dirId" -> Metrics
    const activityMap = new Map<
      string,
      {
        d: string;
        id: number;
        a: number;
        m: number;
        del: number;
        authors: Map<string, number>; // Changed to Map for frequency tracking
        commits: Set<string>;
        fileCounts: Map<string, number>; // Track file activity frequency
      }
    >();

    Object.entries(lifecycle.files).forEach(([filePath, events]) => {
      // Find parent directory ID
      const parts = filePath.split("/");
      const fileName = parts.pop()!; // Extract filename
      const dirPath = parts.join("/");
      const dirId = dirPathToId.get(dirPath);

      if (dirId === undefined) return; // Should not happen if tree logic is correct

      events.forEach((event) => {
        // Format date as YYYY-MM-DD
        const dateStr = format(new Date(event.timestamp * 1000), "yyyy-MM-dd");
        const key = `${dateStr}_${dirId}`;

        if (!activityMap.has(key)) {
          activityMap.set(key, {
            d: dateStr,
            id: dirId,
            a: 0,
            m: 0,
            del: 0,
            authors: new Map(),
            commits: new Set(),
            fileCounts: new Map(),
          });
        }

        const entry = activityMap.get(key)!;

        // Track Author Frequency
        const currentAuthorCount = entry.authors.get(event.author) || 0;
        entry.authors.set(event.author, currentAuthorCount + 1);

        // Track File Frequency
        const currentFileCount = entry.fileCounts.get(fileName) || 0;
        entry.fileCounts.set(fileName, currentFileCount + 1);

        entry.commits.add(event.commit);

        if (event.operation === "A") entry.a++;
        else if (event.operation === "D") entry.del++;
        else entry.m++; // Treat 'M' and 'R' as modifications
      });
    });

    // Convert map to array
    const activity: ActivityMatrixItem[] = Array.from(activityMap.values()).map(
      (item) => {
        // Get Top 3 Authors
        const topAuthors = Array.from(item.authors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((entry) => entry[0]);

        // Get Top 3 Files
        const topFiles = Array.from(item.fileCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((entry) => entry[0]);

        return {
          d: item.d,
          id: item.id,
          a: item.a,
          m: item.m,
          del: item.del,
          au: item.authors.size,
          c: item.commits.size,
          tc: topAuthors,
          tf: topFiles,
        };
      }
    );

    return { metadata, tree: root, activity };
  }
}

export const dataLoader = DataLoader.getInstance();
