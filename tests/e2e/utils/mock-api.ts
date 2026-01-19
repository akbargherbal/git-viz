// tests/e2e/utils/mock-api.ts << 'EOF'
import { Page } from '@playwright/test';

export interface TestFile {
  path: string;
  author?: string;
  commits?: number;
  healthScore?: number;
  additions?: number;
  deletions?: number;
  age_days?: number;
}

export interface TestDataset {
  files: TestFile[];
  dateRange?: [string, string];
  includeTemporalData?: boolean;
  includeCouplingData?: boolean;
  couplingEdges?: Array<{ source: string; target: string; weight: number }>;
}

export async function mockDatasetAPI(page: Page, dataset: TestDataset) {
  // Helper to convert array to record keyed by path
  const toRecord = (items: any[], keyField: string = 'key') => {
    return items.reduce((acc, item) => {
      acc[item[keyField]] = item;
      return acc;
    }, {} as Record<string, any>);
  };

  // 1. Generate File Data matching V2FileIndex interface
  const filesArray = dataset.files.map((f) => {
    const authorEmail = f.author || 'default@test.com';
    const totalCommits = f.commits ?? 5;
    
    return {
      key: f.path,
      first_seen: dataset.dateRange?.[0] ?? '2024-01-01',
      last_modified: dataset.dateRange?.[1] ?? '2024-12-31',
      total_commits: totalCommits,
      unique_authors: 1,
      primary_author: {
        email: authorEmail,
        commit_count: totalCommits,
        percentage: 100
      },
      operations: {
        A: f.additions ?? 100,
        D: f.deletions ?? 20,
        M: Math.max(0, totalCommits - 2)
      },
      age_days: f.age_days ?? 30,
      commits_per_day: 1,
      lifecycle_event_count: totalCommits,
      // Helper fields for temporal data
      _additions: f.additions ?? 100,
      _deletions: f.deletions ?? 20
    };
  });

  // Generate Lifecycle Data (Record<string, RawFileEvent[]>)
  const lifecycleFiles: Record<string, any[]> = {};
  filesArray.forEach(f => {
    lifecycleFiles[f.key] = [{
      commit_hash: 'hash123',
      timestamp: new Date(f.last_modified).getTime() / 1000,
      datetime: f.last_modified,
      operation: 'M',
      author_name: f.primary_author.email.split('@')[0],
      author_email: f.primary_author.email,
      commit_subject: 'Update file'
    }];
  });

  // Generate Directory Stats dynamically
  const dirStats: Record<string, any> = {};
  const processedDirs = new Set<string>();

  filesArray.forEach(f => {
    const parts = f.key.split('/');
    // Generate stats for every parent directory
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join('/');
      if (!processedDirs.has(dirPath)) {
        dirStats[dirPath] = {
          path: dirPath,
          total_commits: 10,
          activity_score: 10
        };
        processedDirs.add(dirPath);
      }
    }
  });
  
  // Ensure root src exists if empty
  if (Object.keys(dirStats).length === 0) {
      dirStats['src'] = { path: 'src', total_commits: 0, activity_score: 0 };
  }

  const routes: Record<string, any> = {
    'manifest.json': {
      repository: 'test-repo',
      datasets: {
        file_metadata: { 
          file: 'metadata/file_index.json', 
          production_ready: true 
        },
        temporal_daily: { 
          file: 'aggregations/temporal_daily.json', 
          production_ready: dataset.includeTemporalData !== false 
        },
        cochange_network: { 
          file: 'networks/cochange_network.json', 
          production_ready: dataset.includeCouplingData === true 
        },
        directory_stats: {
          file: 'aggregations/directory_stats.json',
          production_ready: true
        },
        file_lifecycle: {
          file: 'file_lifecycle.json',
          production_ready: true
        },
        author_network: {
          file: 'networks/author_network.json',
          production_ready: true
        }
      }
    },
    'metadata/file_index.json': {
      files: toRecord(filesArray.map(f => {
        const { _additions, _deletions, ...rest } = f;
        return rest;
      }))
    },
    'aggregations/temporal_daily.json': {
      days: filesArray.map(f => ({
        key: f.last_modified,
        date: f.last_modified,
        commits: f.total_commits,
        files_changed: 1,
        unique_authors: 1,
        operations: {
          A: f._additions,
          D: f._deletions,
          M: 0
        }
      }))
    },
    'networks/cochange_network.json': {
      edges: dataset.couplingEdges || []
    },
    'aggregations/directory_stats.json': {
      directories: dirStats
    },
    'file_lifecycle.json': {
      generated_at: new Date().toISOString(),
      repository_path: '/repo',
      total_files: filesArray.length,
      total_commits: 100,
      total_changes: 1000,
      files: lifecycleFiles
    },
    'networks/author_network.json': {
      nodes: filesArray.map(f => ({
        id: f.primary_author.email,
        email: f.primary_author.email,
        commit_count: f.total_commits,
        collaboration_count: 0
      })),
      edges: []
    }
  };

  await page.route('**/DATASETS_excalidraw/**', route => {
    const url = route.request().url();
    const matches = url.match(/DATASETS_excalidraw\/(.+)$/);
    const filename = matches ? matches[1] : '';
    
    const data = routes[filename];
    if (data) {
      route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify(data) 
      });
    } else {
      console.log(`[MOCK] Dataset not found: ${filename}`);
      route.fulfill({ status: 404, body: '{}' });
    }
  });
}
