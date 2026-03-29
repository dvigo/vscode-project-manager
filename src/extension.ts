import * as vscode from 'vscode';

type ProjectItem = {
	id: string;
	name: string;
	path: string;
	group: string;
	createdAt: number;
	lastOpenedAt?: number;
};

const STORAGE_KEY = 'projects';
const DEFAULT_GROUP = 'General';
const t = vscode.l10n.t;

class ProjectStore {
	constructor(private readonly context: vscode.ExtensionContext) {}

	public getAll(): ProjectItem[] {
		return this.context.globalState.get<ProjectItem[]>(STORAGE_KEY, []);
	}

	public saveAll(projects: ProjectItem[]): Thenable<void> {
		return this.context.globalState.update(STORAGE_KEY, projects);
	}

	public async upsert(project: ProjectItem): Promise<void> {
		const items = this.getAll();
		const existingIndex = items.findIndex((item) => item.path === project.path);

		if (existingIndex >= 0) {
			items[existingIndex] = {
				...items[existingIndex],
				name: project.name,
				group: project.group
			};
		} else {
			items.push(project);
		}

		await this.saveAll(items);
	}

	public async remove(id: string): Promise<void> {
		const items = this.getAll().filter((item) => item.id !== id);
		await this.saveAll(items);
	}

	public async markOpened(id: string): Promise<void> {
		const items = this.getAll().map((item) => {
			if (item.id === id) {
				return {
					...item,
					lastOpenedAt: Date.now()
				};
			}
			return item;
		});

		await this.saveAll(items);
	}

	public async renameGroup(oldGroup: string, newGroup: string): Promise<number> {
		let renamedCount = 0;
		const items = this.getAll().map((item) => {
			if (item.group === oldGroup) {
				renamedCount += 1;
				return {
					...item,
					group: newGroup
				};
			}

			return item;
		});

		if (renamedCount > 0) {
			await this.saveAll(items);
		}

		return renamedCount;
	}
}

class ProjectNode extends vscode.TreeItem {
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

class GroupNode extends vscode.TreeItem {
	constructor(public readonly groupName: string) {
		super(groupName, vscode.TreeItemCollapsibleState.Expanded);
		this.contextValue = 'groupItem';
	}
}

class ProjectsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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
			const groups = [...new Set(projects.map((p) => p.group || DEFAULT_GROUP))].sort((a, b) =>
				a.localeCompare(b)
			);
			return groups.map((groupName) => new GroupNode(groupName));
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

async function addProjectFromWorkspace(store: ProjectStore, provider: ProjectsProvider): Promise<void> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showWarningMessage(t('No workspace is open to add.'));
		return;
	}

	await addProject(store, provider, workspaceFolder.uri.fsPath);
}

async function addProjectFromFolderPicker(store: ProjectStore, provider: ProjectsProvider): Promise<void> {
	const picked = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		title: t('Select a project folder')
	});

	if (!picked || picked.length === 0) {
		return;
	}

	await addProject(store, provider, picked[0].fsPath);
}

async function addProject(store: ProjectStore, provider: ProjectsProvider, projectPath: string): Promise<void> {
	const defaultName = projectPath.split(/[\\/]/).filter(Boolean).pop() ?? t('Project');
	const name = await vscode.window.showInputBox({
		title: t('Project name'),
		value: defaultName,
		ignoreFocusOut: true,
		validateInput: (value) => (!value.trim() ? t('Project name is required.') : undefined)
	});

	if (!name) {
		return;
	}

	const group =
		(await vscode.window.showInputBox({
			title: t('Project group'),
			value: DEFAULT_GROUP,
			ignoreFocusOut: true
		})) ?? DEFAULT_GROUP;

	const project: ProjectItem = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		name: name.trim(),
		path: projectPath,
		group: group.trim() || DEFAULT_GROUP,
		createdAt: Date.now()
	};

	await store.upsert(project);
	provider.refresh();
	vscode.window.showInformationMessage(t('Project "{0}" saved.', project.name));
}

function projectQuickPickItems(projects: ProjectItem[]): vscode.QuickPickItem[] {
	return projects
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

async function pickProject(store: ProjectStore, title: string): Promise<ProjectItem | undefined> {
	const projects = store.getAll();
	if (projects.length === 0) {
		vscode.window.showInformationMessage(t('There are no saved projects yet.'));
		return;
	}

	const items = projectQuickPickItems(projects);
	const picked = await vscode.window.showQuickPick(items, {
		title,
		matchOnDescription: true,
		matchOnDetail: true,
		ignoreFocusOut: true
	});

	if (!picked) {
		return;
	}

	return projects.find((p) => p.name === picked.label && p.path === picked.detail);
}

async function pickOpenTargetWindow(defaultOpenInNewWindow: boolean): Promise<boolean | undefined> {
	const options: vscode.QuickPickItem[] = [
		{ label: t('Open in this window') },
		{ label: t('Open in a new window') }
	];

	const picked = await vscode.window.showQuickPick(options, {
		title: t('Choose where to open the project'),
		ignoreFocusOut: true,
		placeHolder: defaultOpenInNewWindow ? t('Open in a new window') : t('Open in this window')
	});

	if (!picked) {
		return undefined;
	}

	return picked.label === t('Open in a new window');
}

async function openProject(store: ProjectStore, project: ProjectItem, forceNewWindow = false): Promise<void> {
	const defaultOpenInNewWindow = vscode.workspace
		.getConfiguration('projectManager')
		.get<boolean>('openInNewWindow', false);

	const shouldOpenInNewWindow = forceNewWindow
		? true
		: await pickOpenTargetWindow(defaultOpenInNewWindow);

	if (shouldOpenInNewWindow === undefined) {
		return;
	}

	await store.markOpened(project.id);
	await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(project.path), shouldOpenInNewWindow);
}

function asProjectItem(input: ProjectItem | ProjectNode | undefined): ProjectItem | undefined {
	if (!input) {
		return undefined;
	}

	if (input instanceof ProjectNode) {
		return input.project;
	}

	return input;
}

function asGroupName(input: GroupNode | string | undefined): string | undefined {
	if (!input) {
		return undefined;
	}

	if (input instanceof GroupNode) {
		return input.groupName;
	}

	return input;
}

function getGroupNames(store: ProjectStore): string[] {
	return [...new Set(store.getAll().map((project) => project.group || DEFAULT_GROUP))].sort((a, b) =>
		a.localeCompare(b)
	);
}

async function pickGroupName(store: ProjectStore, title: string): Promise<string | undefined> {
	const groups = getGroupNames(store);
	if (groups.length === 0) {
		vscode.window.showInformationMessage(t('There are no groups available to rename.'));
		return undefined;
	}

	const picked = await vscode.window.showQuickPick(groups, {
		title,
		ignoreFocusOut: true
	});

	return picked;
}

async function openProjectFromPicker(store: ProjectStore, forceNewWindow = false): Promise<void> {
	const selectedProject = await pickProject(
		store,
		forceNewWindow ? t('Open project in new window') : t('Open project')
	);
	if (!selectedProject) {
		return;
	}

	await openProject(store, selectedProject, forceNewWindow);
}

async function removeProjectFromPicker(store: ProjectStore, provider: ProjectsProvider): Promise<void> {
	const selectedProject = await pickProject(store, t('Remove project'));
	if (!selectedProject) {
		return;
	}

	const decision = await vscode.window.showWarningMessage(
		t('Workspace "{0}" will be removed from the list.', selectedProject.name),
		{ modal: true },
		t('Remove')
	);

	if (decision !== t('Remove')) {
		return;
	}

	await store.remove(selectedProject.id);
	provider.refresh();
	vscode.window.showInformationMessage(t('Workspace "{0}" removed.', selectedProject.name));
}

async function removeProjectByItem(
	store: ProjectStore,
	provider: ProjectsProvider,
	input: ProjectItem | ProjectNode | undefined
): Promise<void> {
	const selectedProject = asProjectItem(input);
	if (!selectedProject) {
		await removeProjectFromPicker(store, provider);
		return;
	}

	const decision = await vscode.window.showWarningMessage(
		t('Workspace "{0}" will be removed from the list.', selectedProject.name),
		{ modal: true },
		t('Remove')
	);

	if (decision !== t('Remove')) {
		return;
	}

	await store.remove(selectedProject.id);
	provider.refresh();
	vscode.window.showInformationMessage(t('Workspace "{0}" removed.', selectedProject.name));
}

async function renameGroup(
	store: ProjectStore,
	provider: ProjectsProvider,
	input: GroupNode | string | undefined
): Promise<void> {
	const sourceGroup = asGroupName(input) ?? (await pickGroupName(store, t('Select the group to rename')));
	if (!sourceGroup) {
		return;
	}

	const targetGroup = await vscode.window.showInputBox({
		title: t('New name for group "{0}"', sourceGroup),
		value: sourceGroup,
		ignoreFocusOut: true,
		validateInput: (value) => {
			const trimmed = value.trim();
			if (!trimmed) {
				return t('Group name is required.');
			}

			if (trimmed === sourceGroup) {
				return t('The new name must be different from the current one.');
			}

			return undefined;
		}
	});

	if (!targetGroup) {
		return;
	}

	const normalizedTargetGroup = targetGroup.trim();
	const existingGroups = getGroupNames(store);
	if (existingGroups.includes(normalizedTargetGroup)) {
		const mergeDecision = await vscode.window.showWarningMessage(
			t('The group "{0}" already exists. Projects will be merged into it.', normalizedTargetGroup),
			{ modal: true },
			t('Continue')
		);

		if (mergeDecision !== t('Continue')) {
			return;
		}
	}

	const renamedCount = await store.renameGroup(sourceGroup, normalizedTargetGroup);
	if (renamedCount === 0) {
		vscode.window.showInformationMessage(t('No projects were found in group "{0}".', sourceGroup));
		return;
	}

	provider.refresh();
	vscode.window.showInformationMessage(
		t('Group renamed: "{0}" -> "{1}" ({2} project(s)).', sourceGroup, normalizedTargetGroup, renamedCount)
	);
}

export function activate(context: vscode.ExtensionContext): void {
	const store = new ProjectStore(context);
	const provider = new ProjectsProvider(store);

	context.subscriptions.push(
		vscode.window.createTreeView('project-manager.projectsView', {
			treeDataProvider: provider,
			showCollapseAll: true
		}),
		vscode.commands.registerCommand('project-manager.addCurrentWorkspace', () => addProjectFromWorkspace(store, provider)),
		vscode.commands.registerCommand('project-manager.addFolder', () => addProjectFromFolderPicker(store, provider)),
		vscode.commands.registerCommand('project-manager.openProject', () => openProjectFromPicker(store)),
		vscode.commands.registerCommand('project-manager.openProjectInNewWindow', async (input: ProjectItem | ProjectNode | undefined) => {
			const selectedProject = asProjectItem(input);
			if (!selectedProject) {
				await openProjectFromPicker(store, true);
				return;
			}

			await openProject(store, selectedProject, true);
		}),
		vscode.commands.registerCommand('project-manager.removeProject', () => removeProjectFromPicker(store, provider)),
		vscode.commands.registerCommand('project-manager.removeProjectFromNode', async (input: ProjectItem | ProjectNode | undefined) => {
			await removeProjectByItem(store, provider, input);
		}),
		vscode.commands.registerCommand('project-manager.renameGroup', async () => {
			await renameGroup(store, provider, undefined);
		}),
		vscode.commands.registerCommand('project-manager.renameGroupFromNode', async (input: GroupNode | string | undefined) => {
			await renameGroup(store, provider, input);
		}),
		vscode.commands.registerCommand('project-manager.refreshProjects', () => provider.refresh()),
		vscode.commands.registerCommand('project-manager.openProjectFromNode', async (input: ProjectItem | ProjectNode | undefined) => {
			const selectedProject = asProjectItem(input);
			if (!selectedProject) {
				await openProjectFromPicker(store);
				return;
			}

			await openProject(store, selectedProject);
		})
	);
}

export function deactivate(): void {
	// no-op
}
