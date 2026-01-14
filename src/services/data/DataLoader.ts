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

// --- V2 Raw Data Interfaces ---

interface RawLifecycleData {
  generated_at: string;
  repository_path: string;
  total_files: number;
  total_commits: number;
  total_changes: number;
  files: Record<string, RawFileEvent[]>;
}

interface RawFileEvent {
  commit_hash: string;
  timestamp: number;
  datetime: string;
  operation: "A" | "M" | "D" | "R";
  author_name: string;
  author_email: string;
  commit_subject: string;
}

interface V2AuthorNetwork {
  nodes: Array<{
    id: string;
    email: string;
    commit_count: number;
    collaboration_count: number;
  }>;
}

interface V2FileIndex {
  files: Record<string, {
    total_commits: number;
  }>;
}

interface V2DirectoryStats {
  directories: Record<string, {
    path: string;
    total_commits: number;
    activity_score: number;
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
    if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async loadOptimizedDataset(
    baseUrl: string = "/DATASETS_excalidraw",
    onProgress?: (progress: LoadProgress) => void
  ): Promise<OptimizedDataset> {
    const startTime = performance.now();

    try {
      if (onProgress) onProgress({ loaded: 0, total: 4, phase: "metadata" });

      const [lifecycleData, authorNetwork, fileIndex, dirStats] = await Promise.all([
        this.fetchJson<RawLifecycleData>(`${baseUrl}/file_lifecycle.json`, "File Lifecycle"),
        this.fetchJson<V2AuthorNetwork>(`${baseUrl}/networks/author_network.json`, "Author Network"),
        this.fetchJson<V2FileIndex>(`${baseUrl}/metadata/file_index.json`, "File Index"),
        this.fetchJson<V2DirectoryStats>(`${baseUrl}/aggregations/directory_stats.json`, "Directory Stats"),
      ]);

      if (onProgress) onProgress({ loaded: 2, total: 4, phase: "tree" });

      const dataset = this.processRawData(
        lifecycleData,
        authorNetwork,
        fileIndex,
        dirStats
      );

      const totalTime = performance.now() - startTime;
      console.log(`🎉 Dataset loaded in ${(totalTime / 1000).toFixed(2)}s`);

      if (onProgress) onProgress({ loaded: 4, total: 4, phase: "complete" });

      return dataset;
    } catch (error) {
      console.error("Error loading dataset:", error);
      throw error;
    }
  }

  private processRawData(
    lifecycle: RawLifecycleData,
    authorNetwork: V2AuthorNetwork,
    fileIndex: V2FileIndex,
    dirStats: V2DirectoryStats
  ): OptimizedDataset {
    
    // --- 1. Build Directory Tree First (Needed for validation) ---
    let nodeIdCounter = 1;
    const root: OptimizedDirectoryNode = {
      id: 0,
      name: "root",
      path: "",
      type: "directory",
      children: [],
    };

    const dirPathToId = new Map<string, number>();
    dirPathToId.set("", 0);

    const getOrCreateDir = (pathParts: string[], parent: OptimizedDirectoryNode): OptimizedDirectoryNode => {
      if (pathParts.length === 0) return parent;
      const currentName = pathParts[0];
      const remainingParts = pathParts.slice(1);

      let child = parent.children?.find(c => c.name === currentName && c.type === "directory");

      if (!child) {
        const currentPath = parent.path ? `${parent.path}/${currentName}` : currentName;
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

    Object.keys(lifecycle.files).forEach((filePath) => {
      const parts = filePath.split("/");
      const fileName = parts.pop()!;
      const dirNode = getOrCreateDir(parts, root);
      if (!dirNode.children) dirNode.children = [];
      dirNode.children.push({
        id: nodeIdCounter++,
        name: fileName,
        path: filePath,
        type: "file",
      });
    });

    // --- 2. Build Metadata (Now we can filter directory stats) ---
    const allTimestamps = Object.values(lifecycle.files)
      .flat()
      .map((e) => e.timestamp * 1000);

    const minTime = Math.min(...allTimestamps);
    const maxTime = Math.max(...allTimestamps);

    // Aggregate File Types
    const fileTypeMap = new Map<string, number>();
    Object.keys(fileIndex.files).forEach((path) => {
      const parts = path.split('/');
      const filename = parts[parts.length - 1];
      const extIndex = filename.lastIndexOf('.');
      const ext = extIndex > 0 ? filename.substring(extIndex) : 'no-extension';
      fileTypeMap.set(ext, (fileTypeMap.get(ext) || 0) + 1);
    });

    const fileTypes = Array.from(fileTypeMap.entries())
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count);

    // Process Directory Stats - FILTERED by existence in Directory Tree
    const directoryStats = Object.values(dirStats.directories)
      .filter(d => dirPathToId.has(d.path)) // Only include actual directories
      .map(d => ({
        path: d.path,
        total_commits: d.total_commits,
        activity_score: d.activity_score
      }));

    const metadata: RepoMetadata = {
      repository_name: lifecycle.repository_path.split("/").pop() || "Repository",
      generation_date: lifecycle.generated_at,
      date_range: {
        start: new Date(minTime).toISOString(),
        end: new Date(maxTime).toISOString(),
      },
      stats: {
        total_commits: lifecycle.total_commits,
        total_files: lifecycle.total_files,
        total_authors: authorNetwork.nodes.length,
      },
      authors: authorNetwork.nodes.map((node) => ({
        name: node.id,
        email: node.email,
        commit_count: node.commit_count,
      })),
      file_types: fileTypes,
      directory_stats: directoryStats,
    };

    // --- 3. Aggregate Activity ---
    const activityMap = new Map<string, any>();

    Object.entries(lifecycle.files).forEach(([filePath, events]) => {
      const parts = filePath.split("/");
      const fileName = parts.pop()!;
      const dirPath = parts.join("/");
      const dirId = dirPathToId.get(dirPath);

      if (dirId === undefined) return;

      events.forEach((event) => {
        const dateStr = format(new Date(event.timestamp * 1000), "yyyy-MM-dd");
        const key = `${dateStr}_${dirId}`;

        if (!activityMap.has(key)) {
          activityMap.set(key, {
            d: dateStr,
            id: dirId,
            a: 0, m: 0, del: 0,
            authors: new Map(),
            commits: new Set(),
            fileCounts: new Map(),
          });
        }

        const entry = activityMap.get(key)!;
        entry.authors.set(event.author_name, (entry.authors.get(event.author_name) || 0) + 1);
        entry.fileCounts.set(fileName, (entry.fileCounts.get(fileName) || 0) + 1);
        entry.commits.add(event.commit_hash);

        if (event.operation === "A") entry.a++;
        else if (event.operation === "D") entry.del++;
        else entry.m++;
      });
    });

    const activity: ActivityMatrixItem[] = Array.from(activityMap.values()).map((item) => ({
      d: item.d,
      id: item.id,
      a: item.a,
      m: item.m,
      del: item.del,
      au: item.authors.size,
      c: item.commits.size,
      tc: Array.from(item.authors.entries()).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((e: any) => e[0]),
      tf: Array.from(item.fileCounts.entries()).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((e: any) => e[0]),
    }));

    return { metadata, tree: root, activity };
  }
}

export const dataLoader = DataLoader.getInstance();