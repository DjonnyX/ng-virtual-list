# Change Log
All notable changes to this project will be documented in this file.

## [21.11.12] - 2026-04-13

### Fixed
- Fixed an issue where the list would remain stuck to the edges when scrolling started.
- Fixed freezing when scrolling.

### Added
- Added optimization parameter to scrollingSettings.
- Added the scrollingSettings property, which defines scrolling parameters such as velocity, mass, etc.

## [21.11.1] - 2026-04-08

### Added
- Added a new example with a news feed

### Fixed
- Fixed jerking when scrolling

### Improved
- Code refactoring

## [21.11.0] - 2026-04-06

### Added
- Implemented an API inside the list item to manage the list.
- The ability to customize the scroll bar has been implemented.
- Added custom scrollbar example.

### Improved
- Improved overall performance.

### Fixed
- Display defects have been fixed.
- Overall component stability has been improved.

## [20.10.10] - 2026-03-30

### Refactor
- ResizeObserver replaced with internal tick chec.

## [20.10.9] - 2026-03-30

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

## [21.10.8] - 2026-03-19

### Improved
- README.md has been updated

## [21.10.6] - 2026-03-19

### Fixed
- Smooth scrolling has been implemented.
- Fixed initialization of static lists.
- Fixed an issue where scroll animation would stop when adding items to a collection in a static list.
- Fixed handling of the snapScrollToBottom property for static lists.
- Fixed a bug in validating the snappingMethod property.

## [21.10.5] - 2026-03-16

### Fixed
- Smooth scrolling has been implemented.
- Fix a bug in list initialization.

## [21.10.3] - 2026-03-14

### Fixed
- Emit a scroll event after calling scrollTo and scrollToEnd.
- Create modules for 21.x 21.x 21.x.
- Fix a bug in list initialization.
- API optimization. Hiding unnecessary properties and methods.
- If the scroll bar is pinned to the end of the list, moving the scroll bar does not reset this pinning.
- Fixed a bug with scrollSize recalculation after changing the viewport size.
- Fixed a bug with list reinitialization if the collection contained 0 elements.

## [21.10.2] - 2026-03-12

### Fixed
- Fixed an issue with scrollbar updating when navigating with the keyboard after updating a collection.
- Fixed an issue when navigating to a dynamic list item with the keyboard during long scrolling and a small buffer.
- Implemented a stable solution for initializing the list with the snapScrollToBottom property set.

### Improved
- Optimized the API for the dynamicSize property. Improved the description of the itemSize property.

## [21.10.1] - 2026-03-10

### Fixed
- List initialization has been improved and a number of bugs have been fixed

## [21.10.0] - 2026-03-10

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

## [21.9.5] - 2026-03-05

### Fixed
- Improved rendering synchronization
- Manual list update has been implemented

### Improved
- Implemented stop scrolling after calling scrollTo

## [21.9.4] - 2026-03-04

### Fixed
- Artifacts during list initialization has been fixed

## [21.9.3] - 2026-03-03

### Update
- README.md has been fixed

## [21.9.2] - 2026-03-03

### Fixed
- Artifacts when scrolling has been fixed

## [21.9.1] - 2026-03-02

### Fixed
- Fixed list freezing during animations

## [21.9.0] - 2026-03-01

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
