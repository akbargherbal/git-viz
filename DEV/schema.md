# Backend Data Schema Definition

**Protocol:** HTTP/HTTPS (Static JSON files)
**Format:** JSON
**Base Path:** `/DATASETS_excalidraw/`

The frontend `DataLoader` expects three distinct files to be available.

## 1. File Lifecycle Data

**Filename:** `file_lifecycle.json`
**Purpose:** Contains the core evolutionary data of the repository, mapping every file to its history of Git events.

### Schema

```typescript
interface FileLifecycleSchema {
  // ISO 8601 Date string (e.g., "2024-01-20T10:00:00Z")
  analyzed_at: string;

  // Repository identifier (e.g., "owner/repo")
  repository: string;

  // Aggregate statistics
  total_files: number;
  total_commits: number;
  total_changes: number;

  // Dictionary mapping file paths to their event history
  // Key: Relative file path (e.g., "src/components/App.tsx")
  files: Record<string, FileEvent[]>;
}

interface FileEvent {
  // Full Git Commit Hash
  commit: string;

  // Unix Timestamp in SECONDS (not milliseconds)
  // The frontend multiplies this by 1000
  timestamp: number;

  // ISO 8601 Date string
  datetime: string;

  // Git Operation Code
  // 'A' = Added
  // 'M' = Modified
  // 'D' = Deleted
  // 'R' = Renamed
  operation: "A" | "M" | "D" | "R";

  // Committer Name
  author: string;

  // Committer Email
  author_email: string;

  // Commit Message Subject
  subject: string;
}
```

### Critical Constraints

1.  **Timestamp Unit:** Must be **Unix Seconds**. The frontend explicitly calculates `timestamp * 1000`.
2.  **Path Separators:** File keys in the `files` object must use forward slashes `/` as separators to ensure the directory tree builder (`DataLoader.ts` line 148) functions correctly.
3.  **Operations:** While standard Git operations exist, the frontend logic specifically groups `'M'` and `'R'` as modifications, while `'A'` and `'D'` trigger specific creation/deletion logic in the visualizations.

---

## 2. Author Activity Data

**Filename:** `author_activity.json`
**Purpose:** Provides aggregate statistics per contributor for the "Authors" filter and metadata display.

### Schema

```typescript
interface AuthorActivitySchema {
  authors: AuthorStat[];
}

interface AuthorStat {
  // Author Name (should match 'author' in FileEvent)
  author: string;

  // Author Email
  email: string;

  // Count of unique commits by this author
  unique_commits: number;

  // Count of distinct files modified by this author
  files_touched: number;

  // Total number of insertions/deletions/modifications
  total_changes: number;
}
```

---

## 3. File Type Statistics

**Filename:** `file_type_stats.json`
**Purpose:** Used for the "File Types" filter and repository metadata summary.

### Schema

```typescript
interface FileTypeStatsSchema {
  file_types: FileTypeStat[];
}

interface FileTypeStat {
  // File extension including the dot (e.g., ".ts", ".tsx", ".json")
  extension: string;

  // Number of files currently existing with this extension
  count: number;

  // Aggregate number of changes across history for this extension
  total_changes: number;
}
```

---

## Data Ingestion Flow (Frontend)

1.  **Parallel Fetching:** The `DataLoader` fetches all three files simultaneously.
2.  **Normalization:**
    - **Metadata:** Extracted from `file_lifecycle` root and `author_activity`.
    - **Tree Construction:** The `files` keys from `file_lifecycle.json` are split by `/` to build a hierarchical `OptimizedDirectoryNode` tree.
    - **Activity Matrix:** Events are aggregated into time buckets (Day + Directory ID) to create the `ActivityMatrixItem[]` used by the Heatmap.

## Example JSON Snippets

**file_lifecycle.json**

```json
{
  "analyzed_at": "2023-12-01T12:00:00Z",
  "repository": "facebook/react",
  "total_files": 150,
  "total_commits": 500,
  "total_changes": 2000,
  "files": {
    "src/index.ts": [
      {
        "commit": "a1b2c3d",
        "timestamp": 1701432000,
        "datetime": "2023-12-01T12:00:00Z",
        "operation": "A",
        "author": "Jane Doe",
        "author_email": "jane@example.com",
        "subject": "Initial commit"
      }
    ]
  }
}
```

**author_activity.json**

```json
{
  "authors": [
    {
      "author": "Jane Doe",
      "email": "jane@example.com",
      "unique_commits": 45,
      "files_touched": 12,
      "total_changes": 150
    }
  ]
}
```
