import * as vscode from 'vscode';
import { registerProjectCommands } from './commands/projectCommands';
import { ProjectStore } from './store/projectStore';
import { ProjectsProvider } from './views/projectsProvider';

export function activate(context: vscode.ExtensionContext): void {
	const store = new ProjectStore(context);
	const provider = new ProjectsProvider(store);

	context.subscriptions.push(
		vscode.window.createTreeView('project-manager.projectsView', {
			treeDataProvider: provider,
			showCollapseAll: true
		})
	);

	registerProjectCommands(context, store, provider);
}

export function deactivate(): void {
	// no-op
}
