import * as vscode from 'vscode';
import { getSortedGroupNames } from '../utils/projectUtils';
import { ProjectItem } from '../models/project';
import { ProjectStore } from '../store/projectStore';

const t = vscode.l10n.t;

export class ProjectNode extends vscode.TreeItem {
	constructor(public readonly project: ProjectItem) {
		super(project.name, vscode.TreeItemCollapsibleState.None);
		this.description = project.path;
		this.tooltip = `${project.name}\n${project.path}`;
		this.contextValue = 'projectItem';
		this.command = {
			command: 'project-manager.openProjectFromNode',
			title: t('Open Project'),
			arguments: [project]
		};
	}
}

export class GroupNode extends vscode.TreeItem {
	constructor(public readonly groupName: string) {
		super(groupName, vscode.TreeItemCollapsibleState.Expanded);
		this.contextValue = 'groupItem';
	}
}

export class ProjectsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void>();
	public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

	constructor(private readonly store: ProjectStore) {}

	public refresh(): void {
		this.onDidChangeTreeDataEmitter.fire();
	}

	public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	public getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
		const projects = this.store.getAll();

		if (!element) {
			return getSortedGroupNames(projects).map((groupName) => new GroupNode(groupName));
		}

		if (element instanceof GroupNode) {
			return projects
				.filter((project) => project.group === element.groupName)
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((project) => new ProjectNode(project));
		}

		return [];
	}
}
