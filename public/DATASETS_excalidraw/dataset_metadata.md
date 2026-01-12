# Git File Lifecycle Analysis - Dataset Metadata

**Generated:** 2026-01-12T20:21:28.659351+00:00
**Repository:** `/home/akbar/Jupyter_Notebooks/SOFTWARE_ARCHEOLOGY/excalidraw`

## Analysis Summary

- **Total Commits Processed:** 5,321
- **Total File Changes:** 27,857
- **Unique Files Tracked:** 2,751
- **Errors Encountered:** 0
- **Unmerged Files Skipped:** 0

## Generated Files

### directory_tree.json

**File Size:** 340,595 bytes (0.32 MB)
**Path:** `DATASETS_excalidraw/directory_tree.json`

**Format:** JSON (JavaScript Object Notation)

**Top-level keys:** 5 keys
**Structure:**
- `id`: int
- `name`: str
- `path`: str
- `type`: str
- `children`: list (63 items)


---

### repo_metadata.json

**File Size:** 48,255 bytes (0.05 MB)
**Path:** `DATASETS_excalidraw/repo_metadata.json`

**Format:** JSON (JavaScript Object Notation)

**Top-level keys:** 6 keys
**Structure:**
- `repository_name`: str
- `generation_date`: str
- `date_range`: dict (2 items)
- `stats`: dict (3 items)
- `authors`: list (397 items)
- `file_types`: list (36 items)


---

### activity_matrix.json

**File Size:** 2,263,368 bytes (2.16 MB)
**Path:** `DATASETS_excalidraw/activity_matrix.json`

**Format:** JSON (JavaScript Object Notation)

**Structure:** Array with 36701 items


---

### file_lifecycle.json

**File Size:** 18,458,215 bytes (17.60 MB)
**Path:** `DATASETS_excalidraw/file_lifecycle.json`

**Format:** JSON (JavaScript Object Notation)

**Top-level keys:** 8 keys
**Structure:**
- `analyzed_at`: str
- `repository_path`: str
- `total_files`: int
- `total_commits`: int
- `total_changes`: int
- `skipped_unmerged`: int
- `total_errors`: int
- `file_lifecycle`: dict (2751 items)

**Dataset Statistics:**
- Total files analyzed: 2,751
- Analysis timestamp: 2026-01-12T20:21:28.227348+00:00

---

### file_lifecycle_summary.csv

**File Size:** 568,622 bytes (0.54 MB)
**Path:** `DATASETS_excalidraw/file_lifecycle_summary.csv`

**Format:** CSV (Comma-Separated Values)
**Rows:** 2,751
**Columns:** 12

**Columns:**
- `file_path`: object (2,751 non-null)
- `total_events`: int64 (2,751 non-null)
- `added_count`: int64 (2,751 non-null)
- `modified_count`: int64 (2,751 non-null)
- `deleted_count`: int64 (2,751 non-null)
- `renamed_count`: int64 (2,751 non-null)
- `copied_count`: int64 (2,751 non-null)
- `type_changed_count`: int64 (2,751 non-null)
- `first_seen`: object (2,751 non-null)
- `last_seen`: object (2,751 non-null)
- `first_commit`: object (2,751 non-null)
- `last_commit`: object (2,751 non-null)

**Missing Data:** No null values

**Numeric Column Ranges:**
- `total_events`: min=1.00, max=882.00, mean=10.58
- `added_count`: min=0.00, max=7.00, mean=0.65
- `modified_count`: min=0.00, max=880.00, mean=8.89
- `deleted_count`: min=0.00, max=2.00, mean=0.13
- `renamed_count`: min=0.00, max=5.00, mean=0.90
- `copied_count`: min=0.00, max=0.00, mean=0.00
- `type_changed_count`: min=0.00, max=0.00, mean=0.00

**Sample Data (first 3 rows):**
```
           file_path  total_events  added_count  modified_count  deleted_count  renamed_count  copied_count  type_changed_count                first_seen                 last_seen                             first_commit                              last_commit
           README.md            73            2              70              1              0             0                   0 2020-01-02T01:04:44+00:00 2025-12-01T11:15:29+00:00 ec23829fce40fdc0897c966405d265c3e9883f72 06f01e11f824062b54088904fa5a8c7a6bfe0538
        package.json           681            1             680              0              0             0                   0 2020-01-02T01:04:47+00:00 2025-12-01T21:37:42+00:00 6278cd9366ff3468c1c7f7adf78ccb21fb8a861f d080833f4d359e808cd12acdc7dd1c9187c956e5
public/FG_Virgil.ttf            11            1               5              0              5             0                   0 2020-01-02T01:04:47+00:00 2024-01-01T14:48:44+00:00 6278cd9366ff3468c1c7f7adf78ccb21fb8a861f a8064ba3eef10fa50bf5d9f402b779d54558ae76
```

---

### file_lifecycle_events.csv

**File Size:** 10,178,940 bytes (9.71 MB)
**Path:** `DATASETS_excalidraw/file_lifecycle_events.csv`

**Format:** CSV (Comma-Separated Values)
**Rows:** 29,100
**Columns:** 16

**Columns:**
- `file_path`: object (29,100 non-null)
- `status`: object (29,100 non-null)
- `commit_hash`: object (29,100 non-null)
- `commit_datetime`: object (29,100 non-null)
- `commit_timestamp`: int64 (29,100 non-null)
- `author_name`: object (29,100 non-null)
- `author_email`: object (29,100 non-null)
- `commit_subject`: object (29,100 non-null)
- `old_mode`: int64 (29,100 non-null)
- `new_mode`: int64 (29,100 non-null)
- `old_sha`: object (29,100 non-null)
- `new_sha`: object (29,100 non-null)
- `old_path`: object (2,486 non-null)
- `new_path`: object (2,486 non-null)
- `source_path`: float64 (0 non-null)
- `similarity`: float64 (2,486 non-null)

**Missing Data:**
  - `old_path`: 26,614 nulls (91.5%)
  - `new_path`: 26,614 nulls (91.5%)
  - `source_path`: 29,100 nulls (100.0%)
  - `similarity`: 26,614 nulls (91.5%)

**Numeric Column Ranges:**
- `commit_timestamp`: min=1,577,927,084.00, max=1,768,065,314.00, mean=1,668,078,685.83
- `old_mode`: min=0.00, max=120,000.00, mean=94,659.29
- `new_mode`: min=0.00, max=120,000.00, mean=99,380.24
- `source_path`: min=nan, max=nan, mean=nan
- `similarity`: min=50.00, max=100.00, mean=96.81

**Sample Data (first 3 rows):**
```
file_path  status                              commit_hash           commit_datetime  commit_timestamp         author_name                  author_email      commit_subject  old_mode  new_mode                                  old_sha                                  new_sha old_path new_path  source_path  similarity
README.md   added ec23829fce40fdc0897c966405d265c3e9883f72 2020-01-02T01:04:44+00:00        1577927084 Christopher Chedeau              vjeuxx@gmail.com      Initial commit         0    100644 0000000000000000000000000000000000000000 a9e9d4fc1cfa0734d0202fb770253c1d26de3f27      NaN      NaN          NaN         NaN
README.md deleted 6278cd9366ff3468c1c7f7adf78ccb21fb8a861f 2020-01-02T01:04:47+00:00        1577927087 Christopher Chedeau              vjeuxx@gmail.com      Initial commit    100644         0 a9e9d4fc1cfa0734d0202fb770253c1d26de3f27 0000000000000000000000000000000000000000      NaN      NaN          NaN         NaN
README.md   added a6f154b36be3b3bca40e86150d028d38c269b73b 2020-01-03T23:29:13+00:00        1578094153 Faustino Kialungila Faustino.kialungila@gmail.com Adding readme (#83)         0    100644 0000000000000000000000000000000000000000 56ba83cfe1e0d4c35f53a3a8d859076a97b3db81      NaN      NaN          NaN         NaN
```

---
