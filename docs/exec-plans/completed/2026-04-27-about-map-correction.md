# About Map Correction

## Goal

Correct the About page assembly map so it does not imply that NCBI
`geo_loc_name=South Korea` records are Korean temperate japonica cultivars, and
replace the schematic land blobs with an actual equirectangular world map.

## Plan

1. Re-label the visualization as BioSample country metadata, not national
   assembly ownership.
2. Add a specific caution that South Korea-labeled NCBI records are not the
   Korean temperate japonica panel.
3. Use a real CC0 equirectangular world map background and keep bubble overlays
   in matching projection coordinates.
4. Run lint/type/build checks.

## Result

- Updated the About map heading and basis text to say BioSample country metadata.
- Added a South Korea-specific caution explaining that the 7 records are not
  seven Korean temperate japonica cultivar assemblies.
- Replaced the schematic land shapes with the CC0
  `BlankMap-Equirectangular.svg` world map background from Wikimedia Commons.
- Verified `npm run lint`, `npm run type-check`, `npm run check:arch`,
  `npm run build`, `curl -I http://localhost:5173/about`, map image `HTTP 200`,
  and `git diff --check`.
