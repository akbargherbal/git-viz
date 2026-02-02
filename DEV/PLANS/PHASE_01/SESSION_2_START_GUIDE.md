# Session 2 Preparation Guide
## Phase 2: Coupling Lens Restoration

**Quick Start:** Ready to begin Phase 2 in your next session.

---

## What Was Completed (Session 1)

✅ **Phase 1: Data Foundation** - All critical data bugs fixed
- Real operations from `file_index`
- Accurate health scores from `project_hierarchy.attributes`
- Active age factor with dormancy penalties
- All 299 tests passing

**See:** `PHASE_1_COMPLETION_SUMMARY.md` for full details.

---

## What's Next (Session 2)

🎯 **Phase 2: Coupling Lens Restoration**

**Estimated Time:** 45 minutes  
**Complexity:** Low  
**Goal:** Fix lossy coupling index and broken color scale

### Three Changes Required

1. **Add dataset requirement** (`cochange_network.json` - 16 MB)
2. **Replace coupling index** with full edge set
3. **Fix color scale** saturation (0.1 → 0.8)

---

## Pre-Session Checklist

Before starting Session 2:

- [ ] Confirm Phase 1 complete: `pnpm build && pnpm test`
- [ ] All tests passing: 299/299 ✅
- [ ] Review `TREEMAP_REFACTOR_PLAN_v2.md` Phase 2 section
- [ ] Have files ready:
  - `src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx`
  - `src/plugins/treemap-explorer/utils/colorScales.ts`

---

## Session 2 Flow

### Step 1: Add Dataset Requirement
**File:** `TreemapExplorerPlugin.tsx` line ~55  
**Change:** Add one entry to `metadata.dataRequirements`

### Step 2: Replace Coupling Index
**File:** `TreemapExplorerPlugin.tsx` line ~400 (inside `processData()`)  
**Change:** Conditional block - use `CouplingDataProcessor` when available

### Step 3: Fix Color Scale
**File:** `colorScales.ts` line ~77  
**Change:** One number: `0.1` → `0.8`

### Step 4: Verify
- Build & test: `pnpm build && pnpm test`
- Visual check: Switch to Coupling Lens, verify symmetric arcs
- Color check: Observe gradient from dark to bright purple

---

## Success Criteria

After Session 2 completes:

- [ ] `cochange_network.json` loads in network tab (16 MB)
- [ ] Coupling arcs are symmetric (both directions visible)
- [ ] Color gradient visible (not uniform purple)
- [ ] Detail panel matches arc overlay
- [ ] All 299 tests still passing

---

## Files to Request at Session Start

```bash
# 1. Plugin file for dataset requirement and coupling index
cat src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx | head -80

# 2. Color scale file for saturation fix
cat src/plugins/treemap-explorer/utils/colorScales.ts | grep -A 15 "getCouplingColor"
```

This shows exactly what needs to be modified.

---

## Expected Session 2 Deliverables

1. Modified `TreemapExplorerPlugin.tsx` with full coupling support
2. Modified `colorScales.ts` with corrected saturation cap
3. Phase 2 completion summary (analogous to Phase 1)
4. Screenshots showing symmetric arcs and color gradient

---

## Phase 3 Preview

After Phase 2:
- **Phase 3: Time Lens Activity Data**
- Add sparklines to Time Lens detail panel
- Load `file_lifecycle.json` for per-file timelines
- Duration: ~1.5 hours

---

## Reference Documents

- `TREEMAP_REFACTOR_PLAN_v2.md` - Full plan with all 5 phases
- `PHASE_1_COMPLETION_SUMMARY.md` - What was accomplished in Session 1
- `treemap-explorer-audit.md` - Original findings (for context)

---

**Ready for Session 2:** ✅ Yes  
**Phase 1 Status:** ✅ Complete and verified  
**Next Session Goal:** Fix Coupling Lens in 45 minutes
