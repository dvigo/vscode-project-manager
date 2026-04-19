import * as vscode from 'vscode';
import { DEFAULT_GROUP } from '../constants';
import { OpenTarget, ProjectItem } from '../models/project';
import { ProjectStore } from '../store/projectStore';
import {
	buildProjectQuickPickItems,
	defaultProjectNameFromPath,
	getSortedGroupNames,
	resolveOpenInNewWindow
} from '../utils/projectUtils';
import { GroupNode, ProjectNode, ProjectsProvider } from '../views/projectsProvider';

const t = vscode.l10n.t;

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

async function pickOpenTargetWindow(defaultOpenInNewWindow: boolean): Promise<OpenTarget | undefined> {
	const options: Array<vscode.QuickPickItem & { target: OpenTarget }> = [
		{ label: t('Open in this window'), target: 'current' },
		{ label: t('Open in a new window'), target: 'new' }
	];

	const picked = await vscode.window.showQuickPick(options, {
		title: t('Choose where to open the project'),
		ignoreFocusOut: true,
		placeHolder: defaultOpenInNewWindow ? t('Open in a new window') : t('Open in this window')
	});

	return picked?.target;
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

async function pickGroup(store: ProjectStore, title: string): Promise<string | undefined> {
	const groups = getSortedGroupNames(store.getAll());
	const items: vscode.QuickPickItem[] = [
		...groups.map((group) => ({ label: group })),
		{ label: `+ ${t('Create new group...')}`, alwaysShow: true }
	];

	const picked = await vscode.window.showQuickPick(items, {
		title,
		ignoreFocusOut: true,
		placeHolder: t('Select a group or create a new one')
	});

	if (!picked) {
		return undefined;
	}

	if (picked.label === `+ ${t('Create new group...')}`) {
		const newGroup = await vscode.window.showInputBox({
			title: t('New group name'),
			ignoreFocusOut: true,
			validateInput: (value) => {
				const trimmed = value.trim();
				if (!trimmed) {
					return t('Group name is required.');
				}
				if (groups.includes(trimmed)) {
					return t('Group "{0}" already exists.', trimmed);
				}
				return undefined;
			}
		});

		return newGroup?.trim();
	}

	return picked.label;
}

async function addProject(store: ProjectStore, provider: ProjectsProvider, projectPath: string): Promise<void> {
	const defaultName = defaultProjectNameFromPath(projectPath, t('Project'));
	const name = await vscode.window.showInputBox({
		title: t('Project name'),
		value: defaultName,
		ignoreFocusOut: true,
		validateInput: (value) => (!value.trim() ? t('Project name is required.') : undefined)
	});

	if (!name) {
		return;
	}

	const group = await pickGroup(store, t('Select group for project "{0}"', name));
	if (!group) {
		return;
	}

	const project: ProjectItem = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		name: name.trim(),
		path: projectPath,
		group: group,
		createdAt: Date.now()
	};

	await store.upsert(project);
	provider.refresh();
	vscode.window.showInformationMessage(t('Project "{0}" saved in group "{1}".', project.name, project.group));
}

async function pickProject(store: ProjectStore, title: string): Promise<ProjectItem | undefined> {
	const projects = store.getAll();
	if (projects.length === 0) {
		vscode.window.showInformationMessage(t('There are no saved projects yet.'));
		return;
	}

	const items = buildProjectQuickPickItems(projects);
	const picked = await vscode.window.showQuickPick(items, {
		title,
		matchOnDescription: true,
		matchOnDetail: true,
		ignoreFocusOut: true
	});

	if (!picked) {
		return;
	}

	return projects.find((project) => project.name === picked.label && project.path === picked.detail);
}

async function openProject(store: ProjectStore, project: ProjectItem, forceNewWindow = false): Promise<void> {
	const defaultOpenInNewWindow = vscode.workspace
		.getConfiguration('projectManager')
		.get<boolean>('openInNewWindow', false);

	const selectedTarget = forceNewWindow ? undefined : await pickOpenTargetWindow(defaultOpenInNewWindow);
	const shouldOpenInNewWindow = resolveOpenInNewWindow(forceNewWindow, selectedTarget);
	if (shouldOpenInNewWindow === undefined) {
		return;
	}

	await store.markOpened(project.id);
	await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(project.path), shouldOpenInNewWindow);
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

async function confirmAndRemoveProject(
	store: ProjectStore,
	provider: ProjectsProvider,
	project: ProjectItem
): Promise<void> {
	const decision = await vscode.window.showWarningMessage(
		t('Workspace "{0}" will be removed from the list.', project.name),
		{ modal: true },
		t('Remove')
	);

	if (decision !== t('Remove')) {
		return;
	}

	await store.remove(project.id);
	provider.refresh();
	vscode.window.showInformationMessage(t('Workspace "{0}" removed.', project.name));
}

async function removeProjectFromPicker(store: ProjectStore, provider: ProjectsProvider): Promise<void> {
	const selectedProject = await pickProject(store, t('Remove project'));
	if (!selectedProject) {
		return;
	}

	await confirmAndRemoveProject(store, provider, selectedProject);
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

	await confirmAndRemoveProject(store, provider, selectedProject);
}

async function pickGroupName(store: ProjectStore, title: string): Promise<string | undefined> {
	const groups = getSortedGroupNames(store.getAll());
	if (groups.length === 0) {
		vscode.window.showInformationMessage(t('There are no groups available to rename.'));
		return;
	}

	return vscode.window.showQuickPick(groups, { title, ignoreFocusOut: true });
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
	const existingGroups = getSortedGroupNames(store.getAll());
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

async function createGroup(store: ProjectStore, provider: ProjectsProvider): Promise<void> {
	const name = await vscode.window.showInputBox({
		title: t('Create new group'),
		ignoreFocusOut: true,
		validateInput: (value) => {
			const trimmed = value.trim();
			if (!trimmed) {
				return t('Group name is required.');
			}
			const groups = getSortedGroupNames(store.getAll());
			if (groups.includes(trimmed)) {
				return t('Group "{0}" already exists.', trimmed);
			}
			return undefined;
		}
	});

	if (!name) {
		return;
	}

	const projects = store.getAll();
	if (projects.length === 0) {
		vscode.window.showInformationMessage(t('Group "{0}" created. Add projects to see it.', name.trim()));
		return;
	}

	const moveDecision = await vscode.window.showInformationMessage(
		t('Group "{0}" created. Would you like to move a project to it?', name.trim()),
		t('Yes'),
		t('No')
	);

	if (moveDecision === t('Yes')) {
		const selectedProject = await pickProject(store, t('Select a project to move to "{0}"', name.trim()));
		if (selectedProject) {
			selectedProject.group = name.trim();
			await store.upsert(selectedProject);
			provider.refresh();
			vscode.window.showInformationMessage(t('Project "{0}" moved to group "{1}".', selectedProject.name, selectedProject.group));
		}
	}
}

async function moveProjectToGroup(
	store: ProjectStore,
	provider: ProjectsProvider,
	input: ProjectItem | ProjectNode | undefined
): Promise<void> {
	const project = asProjectItem(input) ?? (await pickProject(store, t('Select a project to move')));
	if (!project) {
		return;
	}

	const targetGroup = await pickGroup(store, t('Move project "{0}" to group', project.name));
	if (!targetGroup || targetGroup === project.group) {
		return;
	}

	project.group = targetGroup;
	await store.upsert(project);
	provider.refresh();
	vscode.window.showInformationMessage(t('Project "{0}" moved to group "{1}".', project.name, project.group));
}

async function deleteGroup(
	store: ProjectStore,
	provider: ProjectsProvider,
	input: GroupNode | string | undefined
): Promise<void> {
	const groupName = asGroupName(input) ?? (await pickGroupName(store, t('Select the group to delete')));
	if (!groupName) {
		return;
	}

	if (groupName === DEFAULT_GROUP) {
		vscode.window.showWarningMessage(t('The default group "{0}" cannot be deleted.', DEFAULT_GROUP));
		return;
	}

	const decision = await vscode.window.showWarningMessage(
		t('The group "{0}" will be deleted. Projects within it will be moved to "{1}".', groupName, DEFAULT_GROUP),
		{ modal: true },
		t('Delete')
	);

	if (decision !== t('Delete')) {
		return;
	}

	const movedCount = await store.removeGroup(groupName, DEFAULT_GROUP);
	provider.refresh();
	vscode.window.showInformationMessage(
		t('Group "{0}" deleted. {1} project(s) moved to "{2}".', groupName, movedCount, DEFAULT_GROUP)
	);
}

async function searchProjects(store: ProjectStore): Promise<void> {
	const projects = store.getAll();
	const items = buildProjectQuickPickItems(projects);

	const picked = await vscode.window.showQuickPick(items, {
		title: t('Search Projects'),
		placeHolder: t('Type to search by project name, group, or path...'),
		ignoreFocusOut: false,
		matchOnDescription: true,
		matchOnDetail: true
	});

	if (picked) {
		const project = projects.find(p => p.name === picked.label && p.group === picked.description);
		if (project) {
			await openProject(store, project);
		}
	}
}

export function registerProjectCommands(
	context: vscode.ExtensionContext,
	store: ProjectStore,
	provider: ProjectsProvider
): void {
	context.subscriptions.push(
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
		vscode.commands.registerCommand('project-manager.createGroup', () => createGroup(store, provider)),
		vscode.commands.registerCommand('project-manager.moveProjectToGroup', async (input: ProjectItem | ProjectNode | undefined) => {
			await moveProjectToGroup(store, provider, input);
		}),
		vscode.commands.registerCommand('project-manager.deleteGroup', async () => {
			await deleteGroup(store, provider, undefined);
		}),
		vscode.commands.registerCommand('project-manager.deleteGroupFromNode', async (input: GroupNode | string | undefined) => {
			await deleteGroup(store, provider, input);
		}),
		vscode.commands.registerCommand('project-manager.searchProjects', () => searchProjects(store)),
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
