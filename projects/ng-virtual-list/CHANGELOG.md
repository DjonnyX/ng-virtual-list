# Change Log
All notable changes to this project will be documented in this file.

## [19.10.6] - 2026-03-18

### Fixed
- Smooth scrolling has been implemented.
- Fixed initialization of static lists.
- Fixed an issue where scroll animation would stop when adding items to a collection in a static list.
- Fixed handling of the snapScrollToBottom property for static lists.

## [19.10.4] - 2026-03-16

### Fixed
- Smooth scrolling has been implemented.
- Fix a bug in list initialization.

## [19.10.3] - 2026-03-13

### Fixed
- Emit a scroll event after calling scrollTo and scrollToEnd.
- Create modules for 19.x 19.x 21.x.
- Fix a bug in list initialization.
- API optimization. Hiding unnecessary properties and methods.
- If the scroll bar is pinned to the end of the list, moving the scroll bar does not reset this pinning.
- Fixed a bug with scrollSize recalculation after changing the viewport size.
- Fixed a bug with list reinitialization if the collection contained 0 elements.

## [19.10.2] - 2026-03-12

### Fixed
- Fixed an issue with scrollbar updating when navigating with the keyboard after updating a collection.
- Fixed an issue when navigating to a dynamic list item with the keyboard during long scrolling and a small buffer.
- Implemented a stable solution for initializing the list with the snapScrollToBottom property set.

### Improved
- Optimized the API for the dynamicSize property. Improved the description of the itemSize property.

## [19.10.1] - 2026-03-10

### Fixed
- List initialization has been improved and a number of bugs have been fixed

## [19.10.0] - 2026-03-09

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

## [19.9.6] - 2026-03-05

### Fixed
- Improved rendering synchronization
- Manual list update has been implemented

### Improved
- Implemented stop scrolling after calling scrollTo

## [19.9.5] - 2026-03-04

### Fixed
- Artifacts during list initialization has been fixed

## [19.9.4] - 2026-03-03

### Fixed
- Artifacts when scrolling has been fixed

## [19.9.3] - 2026-03-02

### Fixed
- Fixed list freezing during animations

## [19.9.2] - 2026-03-01

### Fixed
- onViewportChange data

## [19.9.1] - 2026-02-28

### Updated
- README.md

## [19.9.0] - 2026-02-27

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

## [19.8.0] - 2025-09-30

Tests and stabilization

### Fixed
- Buffer calculation errors have been fixed
- Fixed trackBy
- Some fixes in the lazy mode

### Added
- Tests have been implemented

## [19.7.30] - 2025-09-27

Scrolling methods

### Improved
- Scrolling methods have been reworked

### Added
- Added `scrollEnd` callback
- Added `scrollToEnd` callback

## [19.7.29] - 2025-09-27

Jerking when scrolling

### Fixed

- Fixed jerking when scrolling

## [19.7.28] - 2025-09-26

Examples

### Added

- Added link to examples in README.md

## [19.7.27] - 2025-09-26

Screen reader

### Improved

- Performance has been optimized

## [19.7.26] - 2025-09-25

Screen reader

### Improved

- The position of the message block for screen reader has been moved to the beginning

## [19.7.25] - 2025-09-25

Screen reader

### Fixed

- Fixed generation of item numbers for screen readers

## [19.7.24] - 2025-09-25

Screen reader

### Added

- Screen reader support has been implemented

## [19.7.23] - 2025-09-24

Focusing an element

### Improved

- Implemented an API for focusing on an element by a given ID

## [19.7.22] - 2025-09-24

Examples

### Improved

- Optimized the settings of the buffer for examples of use

## [19.7.21] - 2025-09-24

Collection reset

### Fixed

- Collection reset fixed

## [19.7.20] - 2025-09-23

Positioning list items

### Fixed

- Fixed positioning in the linear algorithm when adding elements to a collection

## [19.7.19] - 2025-09-23

Collection Mode

### Added

- Added collection mode property

## [19.7.18] - 2025-09-23

Adding new elements to a collection

### Fixed

- Fixed handling of adding new elements to a collection (for lazy loading)

## [19.7.17] - 2025-09-23

Adding new elements to a collection

### Improved

- Improved handling of adding new elements to a collection (for lazy loading)

## [19.7.16] - 2025-09-22

Scroll events

### Added

- `onScrollReachStart` and `onScrollReachEnd` events have been added

## [19.7.15] - 2025-09-21

Vulnerabilities

### Fixed

- Added validation of incoming parameters
- Some vulnerabilities have been fixed

## [19.7.14] - 2025-09-19

`aria-activedescendant`

### Added

- `aria-activedescendant` processed

## [19.7.13] - 2025-09-19

Snapped elements

### Fixed

- Fixed display of snapped elements

## [19.7.12] - 2025-09-19

Navigating elements

### Fixed

- Fixed navigating elements using the keyboard

## [19.7.11] - 2025-09-19

Collapsing groups

### Improved

- Implemented collapsing groups using the keyboard

## [19.7.10] - 2025-09-18

Code review

## [19.7.9] - 2025-09-18

Group collapsibility
  
### Improved 

- README.md updated

### Added

- Added the ability to collapse groups

### Removed

- The deprecated stickyMap property has been removed.

## [19.7.8] - 2025-09-17

iterations of the scrollTo methods
  
### Improved 

- README.md updated

### Added

- Added Iteration argument to scrollTo methods

## [19.7.7] - 2025-09-16

Internal marks
  
### Removed 

- Internal marks has been removed

## [19.7.6] - 2025-09-16

Project description
  
### Improved 

- README.md updated

## [19.7.5] - 2025-09-16

Project description
  
### Improved 

- README.md updated

## [19.7.4] - 2025-09-15

Focus management during navigation
  
### Added 

- Implemented focus management during navigation and scrolling using the keyboard
  
### Improved 

- README.md updated

## [19.7.3] - 2025-09-14

Item selection improvements
  
### Improved 

- README.md updated
  
### Added 

- Added API for selecting an element
- Measures passed to element template
  
#### Fixed

- Fixed the initial state of selectedIds

## [19.7.2] - 2025-09-10

Project description

### Improved 

- README.md updated

## [19.7.1] - 2025-09-10

Item configuration

### Improved 

- README.md updated
- Added item config and selectable parameter

## [19.7.0] - 2025-09-09

list item selection modes

### Improved 

- README.md updated
- Implemented select, multiselect and unselectable list modes
