# Change Log

All notable changes to the "simple-workspace-manager" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.2.1] - 2026-04-14

### Fixed
- Reverted to optimized marketplace logo for better visual consistency.

## [1.2.0] - 2026-04-14

### Updated
- New visual identity for the Project Manager.
- Updated documentation and internal assets.

## [1.1.0] - 2026-03-31

### Added
- Search functionality for projects in the Project Manager view.
- Search button in the view title bar with search icon.
- Interactive search panel using QuickPick to find projects by name, group, or path.
- Improved tree data provider with parent-child relationship support for better filtering.
- Support for filtering label, description, and detail in project search.

## [1.0.0] - 2026-03-29

- First stable public release.
- Added project/workspace manager view in Activity Bar.
- Added persistent storage for saved entries.
- Added grouped navigation with rename group support.
- Added open actions for current window and new window.
- Added inline item actions (open, open in new window, remove).
- Added mandatory confirmation before removing a workspace.
- Added localization support for 6 languages (en, es, fr, de, pt-br, zh-cn).
- Refactored extension into modules (`store`, `views`, `commands`, `utils`).
- Added smoke tests for contributed commands and utility behavior.