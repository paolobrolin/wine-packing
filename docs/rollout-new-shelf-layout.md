# Rollout: new five-cabinet shelf layout

Status: prepared on branch `new-shelf-layout`, **not rolled out**. Paolo finishes
packing at home in the old shelf order first, then unpacks into the new shelves
one old shelf (box) at a time.

## What changes

- REMOTE bin rules: `src/bins/remote/layout.ts`; bin names: `src/bins/all-bins.ts`
  (`REMOTE_BINS`; old names kept in `LEGACY_REMOTE_BINS`).
- Bottles already at REMOTE get a shelf recommendation. On the first sync, done
  bottles on an old shelf become moves within REMOTE (~386 in the dry run of
  2026-10-28); packed bottles keep their state and get the new shelf as destination.

## Before the rollout

1. ~~CT notes~~ — **done 2026-10-28 20:29**, all 12 verified by read-back:
   - Single boxes → note `Single bottle OWC` (same wording as the PdB 3 L):
     `0183154259` Cheval Blanc 2020, `0222003549` Crichët Pajé 2014 1.5 L,
     `0218819293` Sperss 2021 1.5 L, `0214294589` Comtes 2014,
     `0214294766` Comtes Rosé 2012, `0221050014` La Grande Dame Rosé 2006.
   - Next of Kyn 2022 box sets (prefix the existing note with `OWC `):
     `0218856223`, `0218856224`, `0218856225`, `0218856153` (box) and
     `0218856334`, `0218856378` (magnum box). Not the twin box at Lotten i CA.
2. Paolo has finished packing at home; no app edits during the rollout.

## Rollout

1. Merge `new-shelf-layout` into `master` and push (deploys the app).
2. `refresh_all`, export `/tmp/ct_bottles.json`, snapshot `bottles`, run
   `npx tsx scripts/sync.mts`, snapshot again, diff.
3. Expect: REMOTE bottles on old shelves → pending moves to new shelves; packed
   bottles → new destinations. Compare against the dry run.
4. Write-backs to CT happen as Paolo shelves bottles (normal write-back routine).

## Rollback

Revert the merge on `master` and run a sync; restore rows from the snapshot if needed.
