# Change Log
All notable changes to this project will be documented in this file.

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
