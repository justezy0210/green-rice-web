# About Figure Radius

## Goal

Apply consistent rounded styling to all figures on `/about`, not only the first
figure.

## Result

- Added `rounded-lg` to every outer About figure frame.
- Added `rounded-md` to major inner panels.
- Added `rounded` to small rows, chips, notices, and item boxes.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`
