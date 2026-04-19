import * as vscode from 'vscode';
import { STORAGE_KEY } from '../constants';
import { ProjectItem } from '../models/project';

export class ProjectStore {
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

	public async removeGroup(groupName: string, defaultGroup: string): Promise<number> {
		let movedCount = 0;
		const items = this.getAll().map((item) => {
			if (item.group === groupName) {
				movedCount += 1;
				return {
					...item,
					group: defaultGroup
				};
			}
			return item;
		});

		if (movedCount > 0) {
			await this.saveAll(items);
		}

		return movedCount;
	}
}
