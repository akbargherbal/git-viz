# Diagnostic Summary: Treemap Explorer E2E Failure

## The Failure
The E2E test suite is failing with a `TypeError: Cannot read properties of undefined (reading 'split')` within the `TreemapExplorerPlugin`. This crash prevents the visualization from rendering, causing the test runner to time out while waiting for the SVG elements.

## The Root Cause Analysis

### 1. The Crash Mechanism (Primary Failure)
The crash occurs at **line 302** of `TreemapExplorerPlugin.tsx`:
```typescript
.text((d) => (d.data as EnrichedFileData).key.split("/").pop() || "");
```
This error happens because `d.data.key` is `undefined`.

**Why?**
When the data passed to `d3.hierarchy` is empty (i.e., `filteredData` is `[]`), the resulting hierarchy consists of a single root node with `{ children: [] }`.
1. `root.leaves()` returns `[root]` (the root itself is considered a leaf because it has no children).
2. The code attempts to access `root.data.key`.
3. `root.data` is `{ children: [] }`, so `key` is `undefined`.
4. `undefined.split(...)` throws the TypeError.

### 2. The Data Gap (Why Data is Empty)
The plugin renders successfully in other contexts, but fails in E2E because the **default view is empty**.
1. The Treemap defaults to the **Debt Lens**.
2. The Debt Lens applies a default **Health Threshold of 50** (hiding files with a score > 50).
3. The `fixture-builder.ts` generates "healthy" mock files (scores > 50).
4. **Result:** All files are filtered out, `filteredData` becomes empty, triggering the crash mechanism above.

### 3. The Structural Defect (Data Integrity)
During investigation, a secondary critical issue was found in `src/test-utils/factories.ts`.
The `createMockFileIndex` factory returns `files` as an **Array**, whereas the domain model (`V2FileIndex`) and `DataProcessor` expect a **Record** (Object).
*   **Current Behavior:** `Object.entries(array)` results in keys being indices ("0", "1", "2").
*   **Consequence:** Even if the crash were fixed, the Treemap labels would render as numbers ("0", "1") instead of filenames ("Button.tsx").

## The Solution Plan (Next Session)

To resolve this permanently, we must execute a three-part fix:

1.  **Fix the Factory (`factories.ts`):** Modify `createMockFileIndex` to return a `Record<string, FileData>` keyed by file path, matching the actual application data structure.
2.  **Fix the Plugin (`TreemapExplorerPlugin.tsx`):** Add a guard clause to handle empty `filteredData` gracefully, preventing the d3 hierarchy crash.
3.  **Update the Fixtures (`fixture-builder.ts`):** Explicitly inject "unhealthy" (high-debt) files into the E2E fixtures to ensure the default Debt Lens view is populated.

**Confidence Score:** 98% (Verified via code inspection and stack trace analysis).