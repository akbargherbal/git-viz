// tests/e2e/utils/fixture-builder.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createMockFileIndex,
  createTemporalData,
  createCouplingData,
  createEnrichedFileList,
} from "../../../src/test-utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, "../fixtures/datasets");

// Ensure directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

export function generateFixtures() {
  console.log("Generating E2E fixtures...");

  // 1. File Index (Metadata)
  const files = createEnrichedFileList(50);

  // Inject unhealthy files (score <= 50) to ensure Debt Lens shows data by default
  const unhealthyFiles = [
        {
      key: "src/legacy/ComplexLegacy.ts",
      // ...
      // Force low score:
      // Churn: 100% (Score 0)
      // Authors: 1 (Score 30)
      // Age: Active (Score 100)
      // Total: 0.4*0 + 0.3*30 + 0.3*100 = 39
      operations: { M: 100, A: 0, D: 0, R: 0 },
      unique_authors: 1,
      total_commits: 100
    },
    {
      key: "src/legacy/ComplexLegacy.ts",
      name: "ComplexLegacy.ts",
      path: "src/legacy/ComplexLegacy.ts",
      healthScore: { score: 30, label: "C" }, // Explicit low score
      complexity: 100,
      churn: 50,
    },
    {
      key: "src/core/GodClass.ts",
      name: "GodClass.ts",
      path: "src/core/GodClass.ts",
      healthScore: { score: 45, label: "C" },
      complexity: 80,
      churn: 40,
    },
  ];

  // Merge unhealthy files into the list
  // We cast to any because createMockFileIndex expects TemporalFileData but we're passing EnrichedFileData props
  const allFiles = [...files, ...unhealthyFiles] as any[];

  const fileIndexData = createMockFileIndex({ files: allFiles });

  fs.writeFileSync(
    path.join(FIXTURES_DIR, "file_index.json"),
    JSON.stringify({ files: fileIndexData }, null, 2),
  );

  // 2. Temporal Data (Daily stats)
  const temporal = createTemporalData();

  fs.writeFileSync(
    path.join(FIXTURES_DIR, "temporal_daily.json"),
    JSON.stringify(temporal, null, 2),
  );

  // 3. Coupling Network
  const coupling = createCouplingData();

  fs.writeFileSync(
    path.join(FIXTURES_DIR, "cochange_network.json"),
    JSON.stringify(coupling, null, 2),
  );

  // 4. Author Network
  // Generate mock authors based on file count (createMockFileIndex doesn't provide metadata.authors)
  const authorCount = Math.min(10, Math.max(3, Math.ceil(files.length / 5)));
  const mockAuthors = Array.from({ length: authorCount }, (_, i) => ({
    id: `author-${i}@test.com`,
    email: `author-${i}@test.com`,
    name: `Test Author ${i + 1}`,
    commit_count: Math.floor(Math.random() * 100) + 10,
  }));

  const authorNetwork = {
    nodes: mockAuthors,
    links: [],
  };

  fs.writeFileSync(
    path.join(FIXTURES_DIR, "author_network.json"),
    JSON.stringify(authorNetwork, null, 2),
  );

  // 5. File Lifecycle (Raw events)
  const lifecycleFiles: Record<string, any[]> = {};
  allFiles.forEach((file) => {
    lifecycleFiles[file.path] = [
      {
        commit_hash: "abc1234",
        timestamp: 1672531200, // 2023-01-01
        datetime: "2023-01-01T00:00:00Z",
        operation: "A",
        author_name: "Test Author 1",
        author_email: "author-0@test.com",
        commit_subject: "Initial commit",
      },
      {
        commit_hash: "def5678",
        timestamp: 1704067200, // 2024-01-01
        datetime: "2024-01-01T00:00:00Z",
        operation: "M",
        author_name: "Test Author 2",
        author_email: "author-1@test.com",
        commit_subject: "Update file",
      },
    ];
  });

  const fileLifecycle = {
    generated_at: new Date().toISOString(),
    repository_path: "/path/to/repo",
    total_files: allFiles.length,
    total_commits: 100,
    total_changes: 200,
    files: lifecycleFiles,
  };

  fs.writeFileSync(
    path.join(FIXTURES_DIR, "file_lifecycle.json"),
    JSON.stringify(fileLifecycle, null, 2),
  );

  // 6. Directory Stats
  const directoryStats = {
    directories: {
      src: {
        path: "src",
        total_commits: 50,
        activity_score: 100,
      },
      "src/components": {
        path: "src/components",
        total_commits: 30,
        activity_score: 80,
      },
      "src/legacy": {
        path: "src/legacy",
        total_commits: 10,
        activity_score: 20,
      },
      "src/core": {
        path: "src/core",
        total_commits: 10,
        activity_score: 50,
      },
    },
  };

  fs.writeFileSync(
    path.join(FIXTURES_DIR, "directory_stats.json"),
    JSON.stringify(directoryStats, null, 2),
  );

  console.log(`✓ Fixtures generated in ${FIXTURES_DIR}`);
  console.log(`  - file_index.json (${allFiles.length} files)`);
  console.log(`  - temporal_daily.json`);
  console.log(`  - cochange_network.json`);
  console.log(`  - author_network.json (${authorCount} authors)`);
  console.log(`  - file_lifecycle.json`);
  console.log(`  - directory_stats.json`);
}

// Run if called directly
if (process.argv[1] === __filename) {
  generateFixtures();
}
