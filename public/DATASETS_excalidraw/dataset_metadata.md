# Git File Lifecycle Analysis - Dataset Metadata

**Generated:** 2026-01-14T16:04:33.158151+00:00
**Repository:** `/home/akbar/Jupyter_Notebooks/SOFTWARE_ARCHEOLOGY/excalidraw`
**Generator Version:** 2.0.0

---

## 📊 Analysis Overview

- **Total Commits:** 5,137
- **Total Files Tracked:** 2,739
- **Total Changes Recorded:** 26,822

### Performance Metrics

- **Execution Time:** 0.58s
- **Peak Memory:** 0.0 MB
- **Cache Hit Rate:** 0.0%

---

## 📂 Dataset Files

### 📄 author_network.json (author_network)

**File Size:** 1.77 MB (1,857,260 bytes)
**Format:** JSON

**Root Keys:** `schema_version, network_type, quick_mode, edge_limit, nodes, edges, statistics`
**Analyzing Key:** `nodes`
#### 📊 Data Shape
- **Rows:** 374
- **Columns:** 4 (4 simple, 0 complex)

#### 📋 Column Information
| Column | Data Type | Non-Null | Null % | Complexity |
|--------|-----------|----------|--------|------------|
| `id` | object | 374 | 0.0% | Simple |
| `email` | object | 374 | 0.0% | Simple |
| `commit_count` | int64 | 374 | 0.0% | Simple |
| `collaboration_count` | int64 | 374 | 0.0% | Simple |

#### 🔍 Sample Records
**Sample 1:**
  - **id**: "5153846+dwelle@users.noreply.github.com"
  - **email**: "5153846+dwelle@users.noreply.github.com"
  - **commit_count**: 296
  - **collaboration_count**: 282

**Sample 2:**
  - **id**: "mark@lazycat.hu"
  - **email**: "mark@lazycat.hu"
  - **commit_count**: 140
  - **collaboration_count**: 115

**Sample 3:**
  - **id**: "77840495+excalibot@users.noreply.github.com"
  - **email**: "77840495+excalibot@users.noreply.github.com"
  - **commit_count**: 66
  - **collaboration_count**: 80

#### 📈 Data Distribution
**Analyzing 4 simple column(s):**

**id**:
- Unique values: 374

**email**:
- Unique values: 374

**commit_count**:
- Range: 1.00 to 748.00
- Mean: 13.74, Median: 1.00

**collaboration_count**:
- Range: 0.00 to 353.00
- Mean: 64.32, Median: 40.50


---

### 📄 cochange_network.json (cochange_network)

**File Size:** 21.43 MB (22,474,122 bytes)
**Format:** JSON

**Root Keys:** `schema_version, network_type, quick_mode, pair_limit, min_cochange_count, total_files, total_edges, edges`
**Analyzing Key:** `edges`
#### 📊 Data Shape
- **Rows:** 115,824
- **Columns:** 4 (4 simple, 0 complex)

#### 📋 Column Information
| Column | Data Type | Non-Null | Null % | Complexity |
|--------|-----------|----------|--------|------------|
| `source` | object | 115,824 | 0.0% | Simple |
| `target` | object | 115,824 | 0.0% | Simple |
| `cochange_count` | int64 | 115,824 | 0.0% | Simple |
| `coupling_strength` | float64 | 115,824 | 0.0% | Simple |

#### 🔍 Sample Records
**Sample 1:**
  - **source**: "package-lock.json"
  - **target**: "package.json"
  - **cochange_count**: 345
  - **coupling_strength**: 0.1033

**Sample 2:**
  - **source**: "package.json"
  - **target**: "yarn.lock"
  - **cochange_count**: 241
  - **coupling_strength**: 0.0722

**Sample 3:**
  - **source**: "src/components/App.tsx"
  - **target**: "src/types.ts"
  - **cochange_count**: 205
  - **coupling_strength**: 0.0614

#### 📈 Data Distribution
**Analyzing 4 simple column(s):**

**source**:
- Unique values: 1,662

**target**:
- Unique values: 1,646

**cochange_count**:
- Range: 2.00 to 345.00
- Mean: 3.66, Median: 2.00

**coupling_strength**:
- Range: 0.00 to 0.10
- Mean: 0.00, Median: 0.00


---

### 📄 file_lifecycle.json (core_lifecycle)

**File Size:** 9.56 MB (10,020,079 bytes)
**Format:** JSON

**Root Keys:** `files, total_commits, total_changes, generated_at, repository_path, skipped_unmerged`
**Analyzing Key:** `files`
**⚠️ Analysis Error:** sequence item 0: expected str instance, int found

---

### 📄 directory_stats.json (directory_stats)

**File Size:** 851.23 KB (871,656 bytes)
**Format:** JSON

**Root Keys:** `schema_version, aggregation_type, total_directories, directories`
**Analyzing Key:** `directories`
#### 📊 Data Shape
- **Rows:** 3,030
- **Columns:** 7 (6 simple, 1 complex)

#### 📋 Column Information
| Column | Data Type | Non-Null | Null % | Complexity |
|--------|-----------|----------|--------|------------|
| `key` | object | 3,030 | 0.0% | Simple |
| `path` | object | 3,030 | 0.0% | Simple |
| `total_files` | int64 | 3,030 | 0.0% | Simple |
| `total_commits` | int64 | 3,030 | 0.0% | Simple |
| `unique_authors` | int64 | 3,030 | 0.0% | Simple |
| `operations` | object | 3,030 | 0.0% | Complex |
| `activity_score` | float64 | 3,030 | 0.0% | Simple |

#### 🔍 Sample Records
> *Showing 3 sample(s). Complex fields are summarized.*

**Sample 1:**
  - **key**: "excalidraw-app"
  - **path**: "excalidraw-app"
  - **total_files**: 73
  - **total_commits**: 590
  - **unique_authors**: 23
  - **operations**: {Dict: 4 keys: D, M, A, ...}
  - **activity_score**: 8.08

**Sample 2:**
  - **key**: "excalidraw-app/components"
  - **path**: "excalidraw-app/components"
  - **total_files**: 18
  - **total_commits**: 116
  - **unique_authors**: 10
  - **operations**: {Dict: 4 keys: D, M, A, ...}
  - **activity_score**: 6.44

**Sample 3:**
  - **key**: "excalidraw-app/components/GitHubCorner.tsx"
  - **path**: "excalidraw-app/components/GitHubCorner.tsx"
  - **total_files**: 1
  - **total_commits**: 7
  - **unique_authors**: 3
  - **operations**: {Dict: 3 keys: D, M, R}
  - **activity_score**: 7.0

#### 📈 Data Distribution
**Analyzing 5 simple column(s):**

**key**:
- Unique values: 3,030

**path**:
- Unique values: 3,030

**total_files**:
- Range: 1.00 to 1436.00
- Mean: 3.56, Median: 1.00

**total_commits**:
- Range: 1.00 to 15922.00
- Mean: 28.81, Median: 3.00

**unique_authors**:
- Range: 1.00 to 251.00
- Mean: 3.79, Median: 2.00

**Complex columns (1):** `operations`
> *Contains nested structures (lists/dicts). Detailed distribution skipped.*


---

### 📄 file_index.json (file_metadata)

**File Size:** 1.29 MB (1,351,027 bytes)
**Format:** JSON

**Root Keys:** `schema_version, total_files, generation_method, quick_mode, files`
**Analyzing Key:** `files`
#### 📊 Data Shape
- **Rows:** 2,739
- **Columns:** 10 (8 simple, 2 complex)

#### 📋 Column Information
| Column | Data Type | Non-Null | Null % | Complexity |
|--------|-----------|----------|--------|------------|
| `key` | object | 2,739 | 0.0% | Simple |
| `first_seen` | object | 2,739 | 0.0% | Simple |
| `last_modified` | object | 2,739 | 0.0% | Simple |
| `total_commits` | int64 | 2,739 | 0.0% | Simple |
| `unique_authors` | int64 | 2,739 | 0.0% | Simple |
| `primary_author` | object | 2,739 | 0.0% | Complex |
| `operations` | object | 2,739 | 0.0% | Complex |
| `age_days` | float64 | 2,739 | 0.0% | Simple |
| `commits_per_day` | int64 | 2,739 | 0.0% | Simple |
| `lifecycle_event_count` | int64 | 2,739 | 0.0% | Simple |

#### 🔍 Sample Records
> *Showing 3 sample(s). Complex fields are summarized.*

**Sample 1:**
  - **key**: "excalidraw-app/components/GitHubCorner.tsx"
  - **first_seen**: "2026-01-10T17:15:14+00:00"
  - **last_modified**: "2026-01-10T17:15:14+00:00"
  - **total_commits**: 7
  - **unique_authors**: 3
  - **primary_author**: {Dict: 3 keys: email, commit_count, percentage}
  - **operations**: {Dict: 3 keys: D, M, R}
  - **age_days**: 0.0
  - **commits_per_day**: 0
  - **lifecycle_event_count**: 7

**Sample 2:**
  - **key**: "packages/common/src/__snapshots__/colors.test.ts.snap"
  - **first_seen**: "2026-01-10T17:15:14+00:00"
  - **last_modified**: "2026-01-10T17:15:14+00:00"
  - **total_commits**: 2
  - **unique_authors**: 1
  - **primary_author**: {Dict: 3 keys: email, commit_count, percentage}
  - **operations**: {Dict: 2 keys: M, A}
  - **age_days**: 0.0
  - **commits_per_day**: 0
  - **lifecycle_event_count**: 2

**Sample 3:**
  - **key**: "packages/common/src/colors.test.ts"
  - **first_seen**: "2026-01-10T17:15:14+00:00"
  - **last_modified**: "2026-01-10T17:15:14+00:00"
  - **total_commits**: 2
  - **unique_authors**: 1
  - **primary_author**: {Dict: 3 keys: email, commit_count, percentage}
  - **operations**: {Dict: 2 keys: M, A}
  - **age_days**: 0.0
  - **commits_per_day**: 0
  - **lifecycle_event_count**: 2

#### 📈 Data Distribution
**Analyzing 5 simple column(s):**

**key**:
- Unique values: 2,739

**first_seen**:
- Unique values: 600

**last_modified**:
- Unique values: 600

**total_commits**:
- Range: 1.00 to 822.00
- Mean: 9.79, Median: 3.00

**unique_authors**:
- Range: 1.00 to 96.00
- Mean: 3.24, Median: 2.00

**Complex columns (2):** `primary_author, operations`
> *Contains nested structures (lists/dicts). Detailed distribution skipped.*


---

### 📄 release_snapshots.json (milestone_snapshots)

**File Size:** 10.39 KB (10,644 bytes)
**Format:** JSON

**Root Keys:** `schema_version, snapshot_type, total_snapshots, snapshots`
**Analyzing Key:** `snapshots`
#### 📊 Data Shape
- **Rows:** 14
- **Columns:** 5 (4 simple, 1 complex)

#### 📋 Column Information
| Column | Data Type | Non-Null | Null % | Complexity |
|--------|-----------|----------|--------|------------|
| `tag` | object | 14 | 0.0% | Simple |
| `timestamp` | int64 | 14 | 0.0% | Simple |
| `datetime` | object | 14 | 0.0% | Simple |
| `files_affected` | int64 | 14 | 0.0% | Simple |
| `files` | object | 14 | 0.0% | Complex |

#### 🔍 Sample Records
> *Showing 3 sample(s). Complex fields are summarized.*

**Sample 1:**
  - **tag**: "v0.9.0"
  - **timestamp**: 1625923339
  - **datetime**: "2021-07-10T13:22:19+00:00"
  - **files_affected**: 4
  - **files**: [Array: 4 items, type: dict]

**Sample 2:**
  - **tag**: "v0.10.0"
  - **timestamp**: 1634124830
  - **datetime**: "2021-10-13T11:33:50+00:00"
  - **files_affected**: 5
  - **files**: [Array: 5 items, type: dict]

**Sample 3:**
  - **tag**: "v0.11.0"
  - **timestamp**: 1645104164
  - **datetime**: "2022-02-17T13:22:44+00:00"
  - **files_affected**: 3
  - **files**: [Array: 3 items, type: dict]

#### 📈 Data Distribution
**Analyzing 4 simple column(s):**

**tag**:
- Unique values: 14
  - `v0.9.0`: 1 (7.1%)
  - `v0.10.0`: 1 (7.1%)
  - `v0.11.0`: 1 (7.1%)
  - `v0.12.0`: 1 (7.1%)
  - `v0.13.0`: 1 (7.1%)

**timestamp**:
- Range: 1625923339.00 to 1741697050.00
- Mean: 1676667610.43, Median: 1674562109.50

**datetime**:
- Unique values: 14
  - `2021-07-10T13:22:19+00:00`: 1 (7.1%)
  - `2021-10-13T11:33:50+00:00`: 1 (7.1%)
  - `2022-02-17T13:22:44+00:00`: 1 (7.1%)
  - `2022-07-07T12:56:19+00:00`: 1 (7.1%)
  - `2022-10-27T12:58:44+00:00`: 1 (7.1%)

**files_affected**:
- Range: 1.00 to 13.00
- Mean: 4.07, Median: 2.00

**Complex columns (1):** `files`
> *Contains nested structures (lists/dicts). Detailed distribution skipped.*


---

### 📄 temporal_daily.json (temporal_daily)

**File Size:** 245.50 KB (251,392 bytes)
**Format:** JSON

**Root Keys:** `schema_version, aggregation_level, total_days, days`
**Analyzing Key:** `days`
#### 📊 Data Shape
- **Rows:** 1,384
- **Columns:** 6 (5 simple, 1 complex)

#### 📋 Column Information
| Column | Data Type | Non-Null | Null % | Complexity |
|--------|-----------|----------|--------|------------|
| `key` | object | 1,384 | 0.0% | Simple |
| `date` | object | 1,384 | 0.0% | Simple |
| `commits` | int64 | 1,384 | 0.0% | Simple |
| `files_changed` | int64 | 1,384 | 0.0% | Simple |
| `unique_authors` | int64 | 1,384 | 0.0% | Simple |
| `operations` | object | 1,384 | 0.0% | Complex |

#### 🔍 Sample Records
> *Showing 3 sample(s). Complex fields are summarized.*

**Sample 1:**
  - **key**: "2020-01-02"
  - **date**: "2020-01-02"
  - **commits**: 37
  - **files_changed**: 49
  - **unique_authors**: 5
  - **operations**: {Dict: 3 keys: M, D, A}

**Sample 2:**
  - **key**: "2020-01-03"
  - **date**: "2020-01-03"
  - **commits**: 38
  - **files_changed**: 57
  - **unique_authors**: 11
  - **operations**: {Dict: 4 keys: M, A, D, ...}

**Sample 3:**
  - **key**: "2020-01-04"
  - **date**: "2020-01-04"
  - **commits**: 33
  - **files_changed**: 49
  - **unique_authors**: 8
  - **operations**: {Dict: 3 keys: M, A, D}

#### 📈 Data Distribution
**Analyzing 5 simple column(s):**

**key**:
- Unique values: 1,384

**date**:
- Unique values: 1,384

**commits**:
- Range: 1.00 to 58.00
- Mean: 3.71, Median: 2.00

**files_changed**:
- Range: 1.00 to 641.00
- Mean: 19.38, Median: 10.00

**unique_authors**:
- Range: 1.00 to 11.00
- Mean: 1.99, Median: 2.00

**Complex columns (1):** `operations`
> *Contains nested structures (lists/dicts). Detailed distribution skipped.*


---
