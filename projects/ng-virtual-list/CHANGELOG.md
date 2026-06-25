# Change Log
All notable changes to this project will be documented in this file.

## [22.12.2] - 2026-06-25

### Fixed
- Fixed scrolling Physics Calibration.
- Fixed scrollbar positioning defect.

## [22.12.1] - 2026-06-23

### Fixed
- Fixed visualization defects when transforming dynamic list elements.
- Fixed scroll to item bug for lists with dynamic items and list centering.
- Fixed positioning of list items if the `scrollStartOffset` property is specified for the list.
- Fixed calculations of the height of a list with division by columns or rows when using the fast rendering algorithm.

## [22.12.0] - 2026-06-09

### Added
- Renamed the `snap` property to `stickyEnabled`.
- Implemented the `snapToItem` property.
- Implemented the `snappingDistance` property.
- Implemented the `snapToItemAlign` property with the available values ​​`start`, `center`, and `end`.
- Implemented a `viewport` value for the `itemSize` property.
- Implemented a scroll binding event (`onSnapItem`) on the element so that you can assign sounds, vibrations, or other cues to provide feedback on list scrolling.
- Implemented the `divides` property, which specifies the number of splits (columns or rows).
- Implemented a motion blur effect, the intensity of which is specified by the `motionBlur` property and the effect can be disabled by the `motionBlurEnabled` property.
- Added the `itemTransform` function used to perform custom transformations of the element's position and rotation.
- Implemented `DOF` (Depth Of Field) and `Fog` for `itemTransformation`.
- Implemented presets of popular behaviors for transforming list item positions.
- Added percentage handling for `scrollStartOffset` and `scrollEndOffset`. Supports arithmetic expressions of addition `50% + 25` or subtraction `50% - 25`.
- Implemented the `minItemSize` and `maxItemSize` properties that will be available for lists with dynamic items.
- Supported for groups for divide lists.
- Supported for sticky groups for split lists with dynamic sizes.
- Implemented the `alignment` property with valid values ​​of `none` and `center`.
- Changed the element focus mechanism so that when tracking, focus is not applied to another element.
- Implemented accordion mode.
- Added the `fullSize` parameter to `itemConfigMap`, which will determine the size of the item when the `divides` property is set.
- Implemented the spreadingMode property using the available values `normal` and `infinity`.
- Added the `zIndexWhenSelecting` property.
- Added the `overlappingScrollbar` property.
- Implemented examples of time picker.
- Implemented examples of color picker.
- Implemented examples of desktop.
- Implemented gallery examples.
- Implemented examples of book readers.
- Implemented examples of swipe image.
- Implemented an accordion example.
- Implemented a sample viewer for an online store.
- Implemented a file viewer example.
- Added a page with the API to the site.
- Added a page with a version table.
- Implemented a full-fledged website with usage examples.

### Fixed
- Multiple bugs fixed.
- Improved overall performance of lists.
