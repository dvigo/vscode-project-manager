import * as vscode from 'vscode';
import { DEFAULT_GROUP } from '../constants';
import { OpenTarget, ProjectItem } from '../models/project';

export function buildProjectQuickPickItems(projects: ProjectItem[]): vscode.QuickPickItem[] {
	return [...projects]
		.sort((a, b) => {
			if (a.group !== b.group) {
				return a.group.localeCompare(b.group);
			}
			return a.name.localeCompare(b.name);
		})
		.map((project) => ({
			label: project.name,
			description: project.group,
			detail: project.path
		}));
}

export function getSortedGroupNames(projects: ProjectItem[]): string[] {
	return [...new Set(projects.map((project) => project.group || DEFAULT_GROUP))].sort((a, b) =>
		a.localeCompare(b)
	);
}

export function defaultProjectNameFromPath(projectPath: string, fallback: string): string {
	return projectPath.split(/[\\/]/).filter(Boolean).pop() ?? fallback;
}

export function resolveOpenInNewWindow(
	forceNewWindow: boolean,
	pickedTarget: OpenTarget | undefined
): boolean | undefined {
	if (forceNewWindow) {
		return true;
	}

	if (!pickedTarget) {
		return undefined;
	}

	return pickedTarget === 'new';
}
