# Git File Lifecycle Analysis - Dataset Metadata

**Generated:** 2026-01-13T08:58:33.361003+00:00
**Repository:** `/home/akbar/Jupyter_Notebooks/SOFTWARE_ARCHEOLOGY/excalidraw`

---

## Overview

This dataset contains Git file lifecycle analysis data exported in JSON format.
The analysis tracked **2,751 unique files** across **5,321 commits**.

---

## Dataset Files

### 📄 author_activity.json

**File Size:** 0.07 MB (70,662 bytes)

**Format:** JSON

#### 📊 Data Shape & Size

- **Rows:** 374
- **Columns:** 5
- **Memory Usage:** 71.69 KB

#### 📋 Column Information

| Column | Data Type | Non-Null Count | Null % |
|--------|-----------|----------------|---------|
| `author` | object | 374 | 0.0% |
| `email` | object | 374 | 0.0% |
| `unique_commits` | int64 | 374 | 0.0% |
| `files_touched` | int64 | 374 | 0.0% |
| `total_changes` | int64 | 374 | 0.0% |

#### 🔍 Sample Records

First 3 records (showing key fields):

```json
[
  {
    "author":"aakansha1216@gmail.com",
    "email":"aakansha1216@gmail.com",
    "unique_commits":774,
    "files_touched":1231,
    "total_changes":4620
  },
  {
    "author":"luzar.david@gmail.com",
    "email":"luzar.david@gmail.com",
    "unique_commits":641,
    "files_touched":537,
    "total_changes":2974
  },
  {
    "author":"marcel@excalidraw.com",
    "email":"marcel@excalidraw.com",
    "unique_commits":105,
    "files_touched":1314,
    "total_changes":2806
  }
]
```

#### 📈 Data Distribution

**author**:
- Unique values: 374
- Top 5 values:
  - `mkhuzaimaumair@gmail.com`: 1 (0.3%)
  - `aakansha1216@gmail.com`: 1 (0.3%)
  - `luzar.david@gmail.com`: 1 (0.3%)
  - `marcel@excalidraw.com`: 1 (0.3%)
  - `lipiridis@gmail.com`: 1 (0.3%)

**email**:
- Unique values: 374
- Top 5 values:
  - `mkhuzaimaumair@gmail.com`: 1 (0.3%)
  - `aakansha1216@gmail.com`: 1 (0.3%)
  - `luzar.david@gmail.com`: 1 (0.3%)
  - `marcel@excalidraw.com`: 1 (0.3%)
  - `lipiridis@gmail.com`: 1 (0.3%)

**unique_commits** (numeric):
- Range: 1.00 to 774.00
- Mean: 14.09, Median: 1.00

**files_touched** (numeric):
- Range: 1.00 to 1314.00
- Mean: 23.88, Median: 3.00

**total_changes** (numeric):
- Range: 1.00 to 4620.00
- Mean: 74.48, Median: 3.00



---

### 📄 file_lifecycle.json

**File Size:** 9.37 MB (9,830,141 bytes)

**Format:** JSON

#### 📊 Lifecycle Data Structure

This file contains the complete lifecycle history for all tracked files.

- **Total Files Tracked:** 2,751
- **Total Commits Analyzed:** 5,321
- **Total Changes Recorded:** 27,857

#### 🔍 Event Structure

- **Average events per file:** 10.1
- **Median events per file:** 3
- **Max events (single file):** 881
- **Min events (single file):** 1

#### 📝 Event Record Example

Each file has an array of lifecycle events:

```json
{
  "file": "README.md",
  "events": [
    {
      "commit": "ec23829fce40fdc0897c966405d265c3e9883f72",
      "timestamp": 1577927084,
      "datetime": "2020-01-02T01:04:44+00:00",
      "operation": "A",
      "author": "Christopher Chedeau",
      "author_email": "vjeuxx@gmail.com",
      "subject": "Initial commit"
    },
    {
      "commit": "6278cd9366ff3468c1c7f7adf78ccb21fb8a861f",
      "timestamp": 1577927087,
      "datetime": "2020-01-02T01:04:47+00:00",
      "operation": "D",
      "author": "Christopher Chedeau",
      "author_email": "vjeuxx@gmail.com",
      "subject": "Initial commit"
    }
  ]
}
```

#### 📈 Operation Distribution

| Operation | Count | Percentage |
|-----------|-------|------------|
| Modify (M) | 24,422 | 87.7% |
| Add (A) | 1,731 | 6.2% |
| Rename (R) | 1,338 | 4.8% |
| Delete (D) | 366 | 1.3% |

#### ⚠️ Data Considerations

- **Nested Structure:** Each file path maps to an array of lifecycle events
- **Query Complexity:** Deep nesting requires recursive traversal
- **Memory Requirements:** Large repositories may produce multi-MB files
- **Timestamp Format:** All timestamps in ISO 8601 UTC format



---

### 📄 file_type_stats.json

**File Size:** 0.00 MB (3,124 bytes)

**Format:** JSON

#### 📊 Data Shape & Size

- **Rows:** 35
- **Columns:** 3
- **Memory Usage:** 2.81 KB

#### 📋 Column Information

| Column | Data Type | Non-Null Count | Null % |
|--------|-----------|----------------|---------|
| `extension` | object | 35 | 0.0% |
| `count` | int64 | 35 | 0.0% |
| `total_changes` | int64 | 35 | 0.0% |

#### 🔍 Sample Records

First 3 records (showing key fields):

```json
[
  {
    "extension":".tsx",
    "count":622,
    "total_changes":8373
  },
  {
    "extension":".ts",
    "count":715,
    "total_changes":8048
  },
  {
    "extension":".json",
    "count":213,
    "total_changes":5882
  }
]
```

#### 📈 Data Distribution

**extension**:
- Unique values: 35
- Top 5 values:
  - `.tsx`: 1 (2.9%)
  - `.ts`: 1 (2.9%)
  - `.json`: 1 (2.9%)
  - `.scss`: 1 (2.9%)
  - `.snap`: 1 (2.9%)

**count** (numeric):
- Range: 1.00 to 715.00
- Mean: 78.60, Median: 10.00

**total_changes** (numeric):
- Range: 1.00 to 8373.00
- Mean: 795.91, Median: 29.00



---

### 📄 timeline_monthly.json

**File Size:** 0.01 MB (7,286 bytes)

**Format:** JSON

#### 📊 Data Shape & Size

- **Rows:** 73
- **Columns:** 4
- **Memory Usage:** 6.40 KB

#### 📋 Column Information

| Column | Data Type | Non-Null Count | Null % |
|--------|-----------|----------------|---------|
| `month` | object | 73 | 0.0% |
| `adds` | int64 | 73 | 0.0% |
| `modifies` | int64 | 73 | 0.0% |
| `deletes` | int64 | 73 | 0.0% |

#### 🔍 Sample Records

First 3 records (showing key fields):

```json
[
  {
    "month":"2020-01",
    "adds":147,
    "modifies":860,
    "deletes":42
  },
  {
    "month":"2020-02",
    "adds":44,
    "modifies":407,
    "deletes":8
  },
  {
    "month":"2020-03",
    "adds":51,
    "modifies":655,
    "deletes":2
  }
]
```

#### 📈 Data Distribution

**month**:
- Unique values: 73
- Top 5 values:
  - `2020-01`: 1 (1.4%)
  - `2020-02`: 1 (1.4%)
  - `2020-03`: 1 (1.4%)
  - `2020-04`: 1 (1.4%)
  - `2020-05`: 1 (1.4%)

**adds** (numeric):
- Range: 0.00 to 253.00
- Mean: 23.71, Median: 14.00

**modifies** (numeric):
- Range: 41.00 to 860.00
- Mean: 334.55, Median: 310.00

**deletes** (numeric):
- Range: 0.00 to 42.00
- Mean: 5.01, Median: 2.00



---

### 📄 top_active_files.json

**File Size:** 0.03 MB (27,546 bytes)

**Format:** JSON

**Error analyzing JSON:** unhashable type: 'dict'


---
