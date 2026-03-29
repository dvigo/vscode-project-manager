# Project Manager

Project Manager helps you organize and launch your most used workspaces from a dedicated sidebar in VS Code.

This release is the first public beta.

## Features

- Persistent project/workspace list stored with VS Code global state.
- Group-based organization for fast navigation.
- Dedicated Activity Bar view (`Project manager`).
- One-click open actions:
	- open in current window,
	- open in a new window,
	- remove workspace (with confirmation).
- Group rename support from context menu.
- Localization support for:
	- English,
	- Spanish,
	- French,
	- German,
	- Portuguese (Brazil),
	- Chinese (Simplified).

## Quick Start

1. Open Command Palette (`Cmd/Ctrl + Shift + P`).
2. Run `Add Current Workspace` to save your current workspace.
3. Run `Add Folder` to add external folders.
4. Open the `Project manager` view from the Activity Bar.
5. Use inline actions to open, open in a new window, or remove entries.

## Commands

- `Add Current Workspace`
- `Add Folder`
- `Open Project`
- `Open in a New Window`
- `Remove Project`
- `Refresh Projects`
- `Rename Group`

## Settings

- `projectManager.openInNewWindow`: default preference for opening selected workspaces in a new VS Code window.

## Beta Notes

- This is a preview build (`0.1.0-beta.1`).
- Feedback and issues are welcome.
- Backward compatibility is not guaranteed until stable `1.0.0`.

## Development

```bash
npm install
npm run compile
npm run lint
npm test
```

Run with `F5` to start an Extension Development Host.

## Publish Checklist (Marketplace)

1. Ensure tests pass (`npm test`).
2. Update `CHANGELOG.md`.
3. Tag and publish pre-release package.
4. Verify localized command titles and runtime messages.
