# Change Log
All notable changes to this project will be documented in this file.

## [18.12.0] - 2026-06-09

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

## [18.11.3] - 2026-04-19

### Fixed
- Fixed a freeze when deleting a list.

## [18.11.2] - 2026-04-13

### Fixed
- Fixed an issue where the list would remain stuck to the edges when scrolling started.
- Fixed freezing when scrolling.

### Added
- Added optimization parameter to scrollingSettings.
- Added the scrollingSettings property, which defines scrolling parameters such as velocity, mass, etc.

## [18.11.1] - 2026-04-08

### Fixed
- Fixed jerking when scrolling

### Added
- Added a new example with a news feed

### Fixed
- Fixed jerking when scrolling

### Improved
- Code refactoring

## [18.11.0] - 2026-04-05

### Added
- Implemented an API inside the list item to manage the list.
- The ability to customize the scroll bar has been implemented.
- Added custom scrollbar example.

### Improved
- Improved overall performance.

### Fixed
- Display defects have been fixed.
- Overall component stability has been improved.


## [18.10.7] - 2026-04-01

### Added
- Implement the snapScrollToStart property.

### Improved
- Improved component performance.
- Improved scrollbar theming.
- The snapScrollToBottom property has been renamed to snapScrollToEnd.

### Fixed
- Fixed list initialization at startup.
- Fixed a list positioning issue when displaying a new collection of items.
- Fixed bugs in the scrollTo method.
- Fixed bugs when navigating through elements using the keyboard.
- Fixed some scrollbar positioning issues.
- Fixed display bugs when collapsing groups.
- Fixed display defects when loading new list items.
- Fixed issues with scrollbar re-updating after excessive scrollbar updates.

## [18.10.6] - 2026-03-19

### Fixed
- Smooth scrolling has been implemented.
- Fixed initialization of static lists.
- Fixed an issue where scroll animation would stop when adding items to a collection in a static list.
- Fixed handling of the snapScrollToBottom property for static lists.

## [18.10.4] - 2026-03-16

### Fixed
- Smooth scrolling has been implemented.
- Fix a bug in list initialization.

## [18.10.3] - 2026-03-13

### Fixed
- Emit a scroll event after calling scrollTo and scrollToEnd.
- Create modules for 18.x 20.x 21.x.
- Fix a bug in list initialization.
- API optimization. Hiding unnecessary properties and methods.
- If the scroll bar is pinned to the end of the list, moving the scroll bar does not reset this pinning.
- Fixed a bug with scrollSize recalculation after changing the viewport size.
- Fixed a bug with list reinitialization if the collection contained 0 elements.

## [18.10.2] - 2026-03-12

### Fixed
- Fixed an issue with scrollbar updating when navigating with the keyboard after updating a collection.
- Fixed an issue when navigating to a dynamic list item with the keyboard during long scrolling and a small buffer.
- Implemented a stable solution for initializing the list with the snapScrollToBottom property set.

### Improved
- Optimized the API for the dynamicSize property. Improved the description of the itemSize property.

## [18.10.1] - 2026-03-10

### Fixed
- List initialization has been improved and a number of bugs have been fixed

## [18.10.0] - 2026-03-10

### Fixed
- Correcting the position of the scroll bar in a dynamic list
- Visualization of SnappingMethods modes (bug)
- Fixed a bug related to the onScrollReachEnd event
- Update position when collection changes (bug)
- The scroll bar position has been adjusted to account for offsets.
- Keyboard navigation has been fixed

### Feature
- Implemented stop scrolling after calling scrollTo
- Implemented scrollbar animation
- Implemented automatic hiding of the scrollbar if it is not scrolled.
- Added thehe scrollbarEnabled property. Default true
- Overscroll support
- Added the scrollbarInteractive property. Default true
- Added 'hoverFill' and 'pressedFill' states for the scrollbar
- Added the rippleEnabled property. Default true
- Added the animationParams property. Default value is { scrollToItem: 50, navigateToItem: 150 }.
- Added the scrollBehavior property. Default 'instant'.
- Implemented animation of element focusing.

## [18.9.4] - 2026-03-05

### Fixed
- Improved rendering synchronization
- Manual list update has been implemented

### Improved
- Implemented stop scrolling after calling scrollTo

## [18.9.3] - 2026-03-04

### Fixed
- Artifacts during list initialization has been fixed

## [18.9.2] - 2026-03-03

### Fixed
- Artifacts when scrolling has been fixed

## [18.9.1] - 2026-03-02

### Fixed
- Fixed list freezing during animations

## [18.9.0] - 2026-03-01

Virtual scrolling. Text direction is supported. Loading state. Scrollbar theme. Max click distance. Scroll offsets. Scrollbar min size.

### Added
- Added `langToDir` property
- Added `loading` property
- Added `scrollbarTheme` property
- Added `clickDistance` property
- Added `waitForPreparation` property
- Added `scrollStartOffset` property
- Added `scrollEndOffset` property
- Added `snapScrollToBottom` property
- Added `snapToEndTransitionInstantOffset` property
- Added `scrollbarMinSize` property

### Fixed
- Fixed CBE-2025-9864 security vulnerability

## [18.8.0] - 2025-09-30

Tests and stabilization

### Fixed
- Buffer calculation errors have been fixed
- Fixed trackBy
- Some fixes in the lazy mode

### Added
- Tests have been implemented

## [18.7.18] - 2025-09-28

Scrolling methods

### Improved
- Scrolling methods have been reworked

### Added
- Added `scrollEnd` callback
- Added `scrollToEnd` callback

## [18.7.17] - 2025-09-27

Jerking when scrolling

### Fixed

- Fixed jerking when scrolling

## [18.7.16] - 2025-09-26

Examples

### Added

- Added link to examples in README.md

## [18.7.15] - 2025-09-26

Screen reader

### Added

- Screen reader support has been implemented

## [18.7.14] - 2025-09-25

Focusing an element

### Improved

- Implemented an API for focusing on an element by a given ID

## [18.7.13] - 2025-09-24

Collection Mode

### Added

- Added collection mode property

### Fixed

- Collection reset fixed
- Fixed positioning in the linear algorithm when adding elements to a collection

### Improved

- Optimized the settings of the buffer for examples of use

## [18.7.12] - 2025-09-23

Scroll events

### Added

- `onScrollReachStart` and `onScrollReachEnd` events have been added

## [18.7.11] - 2025-09-22

Vulnerabilities

### Fixed

- Added validation of incoming parameters
- Some vulnerabilities have been fixed

## [18.7.10] - 2025-09-21

Navigating elements

## Fixed

- Fixed navigating elements using the keyboard

## [18.7.9] - 2025-09-19

Collapsing groups

### Improved

- Implemented collapsing groups using the keyboard

## [18.7.8] - 2025-09-18

ChangeLog
  
### Fixed 

- CHANGELOG.md fixed

## [18.7.7] - 2025-09-18

Group collapsibility
  
### Improved 

- README.md updated

### Added

- Added the ability to collapse groups

### Removed

- The deprecated stickyMap property has been removed.

## [18.7.6] - 2025-09-17

iterations of the scrollTo methods
  
### Improved 

- README.md updated

### Added

- Added Iteration argument to scrollTo methods

## [18.7.5] - 2025-09-16

Internal marks
  
### Removed 

- Internal marks has been removed

## [18.7.4] - 2025-09-16

Project description
  
### Improved 

- README.md updated

## [18.7.3] - 2025-09-15

Focus management during navigation
  
### Added 

- Implemented focus management during navigation and scrolling using the keyboard
  
### Improved 

- README.md updated

## [18.7.2] - 2025-09-14

Item selection improvements
  
### Improved 

- README.md updated
  
### Added 

- Added API for selecting an element
- Measures passed to element template
  
### Fixed

- Fixed the initial state of selectedIds

## [18.7.1] - 2025-09-10

Item configuration

### Improved 

- README.md updated
- Added item config and selectable parameter

## [18.7.0] - 2025-09-09

list item selection modes

### Improved 

- README.md updated
- Implemented select, multiselect and unselectable list modes
