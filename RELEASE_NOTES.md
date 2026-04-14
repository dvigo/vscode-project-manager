## v1.1.0 - Project Search

### Features

- **Search functionality** for projects in the Project Manager view
- Interactive search panel using QuickPick to find projects by name, group, or path
- Search button in the view title bar with search icon
- Enhanced tree data provider with parent-child relationship support for better filtering

### What's New

- New `Search Projects` command accessible via the search icon in the view
- Improved filtering capabilities with support for label, description, and detail matching
- Better performance with optimized tree provider

### Changes

- Added search command with keyboard shortcut
- Updated all language translations (EN, DE, ES, FR, PT-BR, ZH-CN)
- Improved TreeDataProvider with getParent() method for better filtering support

### Installation

Download the `simple-workspace-manager-1.1.0.vsix` file and install it using:
```bash
code --install-extension simple-workspace-manager-1.1.0.vsix
```

Or through VS Code marketplace.

### Localization

Full support for:
- English
- Spanish
- French
- German
- Portuguese (Brazil)
- Chinese (Simplified)

### Bug Fixes

- Better support for tree view filtering in VS Code 1.110+

### Backward Compatibility

All changes are fully backward compatible with v1.0.0. Existing projects and groups will work seamlessly with the new search functionality.
