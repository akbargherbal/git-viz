# Git File Lifecycle Analysis - Dataset Metadata

**Generated:** 2026-02-01T18:07:32.336853+00:00
**Repository:** `/home/akbar/Jupyter_Notebooks/SOFTWARE_ARCHEOLOGY/excalidraw`
**Generator Version:** 2.2.0
**Schema Version:** 1.1.0

---

## 📊 Analysis Overview

- **Total Commits:** 5,137
- **Total Files Tracked:** 3,484
- **Total Changes Recorded:** 26,822

### Phase 5 Enhancements ✨

This dataset includes rich metadata for each commit:
- **Temporal Labels**: Year, quarter, month, week number, day of week, day of year
- **Author Normalization**: Consistent author IDs and email domains
- **Diff Statistics**: Lines added and deleted per change
- **Position Metrics**: Sequence numbers and first/last commit flags

### Performance Metrics

- **Execution Time:** 5.18s
- **Peak Memory:** 0.0 MB
- **Cache Hit Rate:** 0.0%

---

## 📂 Dataset Files

### `networks/author_network.json`

**Size:** 1,854,794 bytes

Collaboration graph. Nodes are authors; edges connect pairs who co-modified at least one file, weighted by shared-file count.

```json
{
  "schema_version": "1.0.0",
  "network_type": "author_collaboration",
  "quick_mode": false,
  "edge_limit": null,
  "nodes": [
    {
      "id": "alice@example.com",
      "email": "alice@example.com",
      "commit_count": 42,
      "collaboration_count": 2
    }
  ],
  "edges": [
    {
      "source": "alice@example.com",
      "target": "bob@example.com",
      "weight": 5,
      "shared_files": 3
    }
  ],
  "statistics": {
    "total_authors": 4,
    "total_edges": 3,
    "density": 0.5
  }
}
```

### `networks/cochange_network.json`

**Size:** 16,301,257 bytes

File-coupling graph. Edges link files modified in the same commit, scored by coupling strength relative to total commits.

```json
{
  "schema_version": "1.0.0",
  "network_type": "file_cochange",
  "quick_mode": false,
  "pair_limit": null,
  "min_cochange_count": 2,
  "total_files": 8,
  "total_edges": 4,
  "edges": [
    {
      "source": "src/main.py",
      "target": "src/utils.py",
      "cochange_count": 6,
      "coupling_strength": 0.3846
    }
  ]
}
```

### `file_lifecycle.json`

**Size:** 20,817,664 bytes

Per-file event log. Each entry in `files[<path>]` is one commit that touched that file, enriched with temporal labels, author normalization, diff stats, and position metrics.

```json
{
  "files": {
    "src/main.py": [
      {
        "commit_hash": "abc123def456...",
        "timestamp": 1712927658,
        "datetime": "2024-04-12T13:14:18+00:00",
        "operation": "M",
        "author_name": "John Doe",
        "author_email": "john@example.com",
        "author_id": "john_doe_john",
        "author_domain": "example.com",
        "commit_subject": "refactor: extract helper",
        "temporal": {
          "year": 2024,
          "quarter": 2,
          "month": 4,
          "week_no": 15,
          "day_of_week": 4,
          "day_of_year": 103
        },
        "lines_added": 15,
        "lines_deleted": 3,
        "sequence": 42,
        "is_first": false,
        "is_last": false
      }
    ]
  },
  "total_commits": 156,
  "total_changes": 412,
  "schema_version": "1.1.0",
  "enhancements": {
    "temporal_labels": true,
    "author_normalization": true,
    "diff_stats": true,
    "position_metrics": true
  }
}
```

### `aggregations/directory_stats.json`

**Size:** 1,137,989 bytes

Directory-level rollup: file count, commit volume, author diversity, and an activity score (commits per contained file).

```json
{
  "schema_version": "1.0.0",
  "aggregation_type": "directory_hierarchy",
  "total_directories": 5,
  "directories": {
    "src": {
      "path": "src",
      "total_files": 9,
      "total_commits": 87,
      "unique_authors": 3,
      "operations": {
        "A": 9,
        "M": 74,
        "D": 4
      },
      "activity_score": 9.67
    }
  }
}
```

### `metadata/file_index.json`

**Size:** 2,530,269 bytes

Per-file summary statistics: commit count, author breakdown, operation distribution, and activity velocity.

```json
{
  "schema_version": "1.0.0",
  "total_files": 24,
  "generation_method": "streaming",
  "quick_mode": false,
  "files": {
    "src/main.py": {
      "first_seen": "2024-01-10T08:00:00+00:00",
      "last_modified": "2024-04-12T13:14:18+00:00",
      "total_commits": 18,
      "unique_authors": 3,
      "top_authors": {
        "authors": [
          {
            "email": "alice@example.com",
            "commit_count": 10,
            "percentage": 55.6
          }
        ],
        "coverage_percentage": 72.2
      },
      "operations": {
        "A": 1,
        "M": 17
      },
      "age_days": 92.21,
      "commits_per_day": 0.1953,
      "lifecycle_event_count": 18
    }
  }
}
```

### `frontend/file_metrics_index.json`

**Size:** 3,946,139 bytes

Flat `path → metrics` index for O(1) lookup. Powers the Detail Panel with per-file volume, coupling partners, and lifecycle state.

```json
{
  "src/main.py": {
    "identifiers": {
      "author_ids": [
        "alice_smith_alice",
        "bob_jones_bob"
      ],
      "primary_author_id": "alice_smith_alice",
      "primary_author_percentage": 0.67
    },
    "volume": {
      "lines_added": 420,
      "lines_deleted": 110,
      "net_change": 310,
      "total_commits": 18
    },
    "coupling": {
      "max_strength": 0.72,
      "top_partners": [
        {
          "path": "src/utils.py",
          "strength": 0.72
        },
        {
          "path": "tests/test_main.py",
          "strength": 0.38
        }
      ]
    },
    "lifecycle": {
      "created_iso": "2024-01-10T08:00:00+00:00",
      "last_modified_iso": "2024-04-12T13:14:18+00:00",
      "is_dormant": false
    }
  }
}
```

### `milestones/release_snapshots.json`

**Size:** 10,657 bytes

Release snapshots pinned to git tags. Each snapshot lists the files touched at that tag, grouped by event type (`creation` or `release`).

```json
{
  "schema_version": "1.0.0",
  "snapshot_type": "release_milestones",
  "total_snapshots": 3,
  "snapshots": [
    {
      "tag": "v1.0",
      "timestamp": 1712927658,
      "datetime": "2024-04-12T13:14:18+00:00",
      "files_affected": 4,
      "files": [
        {
          "path": "src/main.py",
          "event_type": "creation",
          "operation": ""
        },
        {
          "path": "src/utils.py",
          "event_type": "release",
          "operation": "M"
        }
      ]
    }
  ]
}
```

### `frontend/project_hierarchy.json`

**Size:** 2,560,783 bytes

Recursive directory tree for Treemap Explorer. Leaf nodes are files with health scores and attributes; internal nodes aggregate stats bottom-up from their children.

```json
{
  "meta": {
    "generated_at": "2024-04-14T10:00:00+00:00",
    "root_path": "/",
    "repository_name": "my-project"
  },
  "tree": {
    "name": "root",
    "path": "",
    "type": "directory",
    "stats": {
      "total_commits": 156,
      "health_score_avg": 74
    },
    "children": [
      {
        "name": "src",
        "path": "src",
        "type": "directory",
        "stats": {
          "total_commits": 120,
          "health_score_avg": 78
        },
        "children": [
          {
            "name": "main.py",
            "path": "src/main.py",
            "type": "file",
            "value": 18,
            "attributes": {
              "health_score": 85,
              "health_category": "healthy",
              "bus_factor_status": "low-risk",
              "churn_rate": 0.042,
              "primary_author_id": "alice_smith",
              "last_modified_age_days": 2.5,
              "created_at_iso": "2024-01-10T08:00:00+00:00"
            }
          }
        ]
      }
    ]
  }
}
```

### `frontend/temporal_activity_map.json`

**Size:** 393,253 bytes

Weekly activity heatmap matrix keyed by directory. Each week maps to `[commits, lines_changed, unique_authors]`.

```json
{
  "meta": {
    "granularity": "week",
    "start_date": "2024-W02",
    "end_date": "2024-W15",
    "data_schema": [
      "commits",
      "lines_changed",
      "unique_authors"
    ]
  },
  "data": {
    "src": {
      "2024-W02": [
        4,
        185,
        2
      ],
      "2024-W03": [
        1,
        23,
        1
      ],
      "2024-W15": [
        3,
        92,
        2
      ]
    },
    "tests": {
      "2024-W03": [
        2,
        67,
        1
      ],
      "2024-W15": [
        1,
        14,
        1
      ]
    }
  }
}
```

### `aggregations/temporal_daily.json`

**Size:** 241,078 bytes

Daily aggregation: commit volume, files changed, active authors, and operation mix per calendar day.

```json
{
  "schema_version": "1.0.0",
  "aggregation_level": "daily",
  "total_days": 47,
  "days": {
    "2024-04-12": {
      "date": "2024-04-12",
      "commits": 3,
      "files_changed": 7,
      "unique_authors": 2,
      "operations": {
        "A": 1,
        "M": 5,
        "D": 1
      }
    }
  }
}
```

---

## 📖 Usage Notes

### Temporal Analysis
Use the `temporal` object to:
- Group commits by week, month, quarter, or year
- Analyze activity patterns by day of week
- Track development velocity over time

### Author Analysis
Use `author_id` for:
- Consistent author identification across email variations
- Grouping contributions by author
- Use `author_domain` to identify organization contributions

### Diff Statistics
Use `lines_added` and `lines_deleted` to:
- Calculate code churn
- Identify hotspots of activity
- Measure commit size and complexity

### Position Metrics
Use `sequence`, `is_first`, and `is_last` to:
- Identify file creation and final modifications
- Track commit order within file history
- Build timeline visualizations
