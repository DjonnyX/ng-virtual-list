# Change Log
All notable changes to this project will be documented in this file.

## [17.10.4] - 2026-03-16

### Fixed
- Smooth scrolling has been implemented.
- Fix a bug in list initialization.

## [17.10.3] - 2026-03-13

### Fixed
- Emit a scroll event after calling scrollTo and scrollToEnd.
- Create modules for 17.x 20.x 21.x.
- Fix a bug in list initialization.
- API optimization. Hiding unnecessary properties and methods.
- If the scroll bar is pinned to the end of the list, moving the scroll bar does not reset this pinning.
- Fixed a bug with scrollSize recalculation after changing the viewport size.
- Fixed a bug with list reinitialization if the collection contained 0 elements.

## [17.10.2] - 2026-03-12

### Fixed
- Fixed an issue with scrollbar updating when navigating with the keyboard after updating a collection.
- Fixed an issue when navigating to a dynamic list item with the keyboard during long scrolling and a small buffer.
- Implemented a stable solution for initializing the list with the snapScrollToBottom property set.

### Improved
- Optimized the API for the dynamicSize property. Improved the description of the itemSize property.

## [17.10.1] - 2026-03-10

### Fixed
- List initialization has been improved and a number of bugs have been fixed

## [17.10.0] - 2026-03-10

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

## [17.9.4] - 2026-03-05

### Fixed
- Improved rendering synchronization
- Manual list update has been implemented

### Improved
- Implemented stop scrolling after calling scrollTo

## [17.9.3] - 2026-03-04

### Fixed
- Artifacts during list initialization has been fixed

## [17.9.2] - 2026-03-03

### Fixed
- Artifacts when scrolling has been fixed

## [17.9.1] - 2026-03-02

### Fixed
- Fixed list freezing during animations

## [17.9.0] - 2026-03-01

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

## [17.8.0] - 2025-09-30

Tests and stabilization

### Fixed
- Buffer calculation errors have been fixed
- Fixed trackBy
- Some fixes in the lazy mode

## Added
- Tests have been implemented

## [17.7.19] - 2025-09-28

Scrolling methods

### Improved
- Scrolling methods have been reworked

### Added
- Added `scrollEnd` callback
- Added `scrollToEnd` callback

## [17.7.18] - 2025-09-27

Jerking when scrolling

### Fixed

- Fixed jerking when scrolling

## [17.7.17] - 2025-09-26

Examples

### Added

- Added link to examples in README.md

## [17.7.16] - 2025-09-26

Screen reader

### Added

- Screen reader support has been implemented

## [17.7.15] - 2025-09-25

Focusing an element

### Improved

- Implemented an API for focusing on an element by a given ID

## [17.7.14] - 2025-09-24

Collection Mode

### Added

- Added collection mode property

### Fixed

- Collection reset fixed
- Fixed positioning in the linear algorithm when adding elements to a collection

### Improved

- Optimized the settings of the buffer for examples of use

## [17.7.13] - 2025-09-23

Scroll events

### Added

- `onScrollReachStart` and `onScrollReachEnd` events have been added

## [17.7.12] - 2025-09-22

Vulnerabilities

### Fixed

- Added validation of incoming parameters
- Some vulnerabilities have been fixed

## [17.7.11] - 2025-09-21

Project description
  
### Improved 

- README.md updated

## [16.7.10] - 2025-09-21

Navigating elements

### Fixed

- Fixed navigating elements using the keyboard

## [17.7.9] - 2025-09-19

Collapsing groups

## Improved

- Implemented collapsing groups using the keyboard

## [17.7.8] - 2025-09-18

ChangeLog
  
### Fixed 

- CHANGELOG.md fixed

## [17.7.7] - 2025-09-18

Group collapsibility
  
### Improved 

- README.md updated

### Added

- Added the ability to collapse groups

### Removed

- The deprecated stickyMap property has been removed.

## [17.7.6] - 2025-09-17

iterations of the scrollTo methods
  
### Improved 

- README.md updated

### Added

- Added Iteration argument to scrollTo methods

## [17.7.5] - 2025-09-16

Internal marks
  
### Removed 

- Internal marks has been removed

## [17.7.4] - 2025-09-16

Project description
  
### Improved 

- README.md updated

## [17.7.3] - 2025-09-15

Focus management during navigation
  
### Added 

- Implemented focus management during navigation and scrolling using the keyboard
  
### Improved 

- README.md updated

## [17.7.2] - 2025-09-14

Item selection improvements
  
### Improved 

- README.md updated
  
### Added 

- Added API for selecting an element
- Measures passed to element template
  
### Fixed

- Fixed the initial state of selectedIds

## [17.7.1] - 2025-09-10

Item configuration

### Improved 

- README.md updated
- Added item config and selectable parameter

## [17.7.0] - 2025-09-09

list item selection modes

### Improved 

- README.md updated
- Implemented select, multiselect and unselectable list modes
