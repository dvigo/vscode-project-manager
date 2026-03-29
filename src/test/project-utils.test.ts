import * as assert from 'assert';
import {
	buildProjectQuickPickItems,
	getSortedGroupNames,
	resolveOpenInNewWindow
} from '../utils/projectUtils';
import { ProjectItem } from '../models/project';

suite('Project Utils Test Suite', () => {
	test('sorts group names and applies default fallback', () => {
		const projects: ProjectItem[] = [
			{ id: '1', name: 'B', path: '/tmp/b', group: '', createdAt: 1 },
			{ id: '2', name: 'A', path: '/tmp/a', group: 'Work', createdAt: 1 },
			{ id: '3', name: 'C', path: '/tmp/c', group: 'Personal', createdAt: 1 }
		];

		const groups = getSortedGroupNames(projects);
		assert.deepStrictEqual(groups, ['General', 'Personal', 'Work']);
	});

	test('creates quick pick items sorted by group then name', () => {
		const projects: ProjectItem[] = [
			{ id: '1', name: 'Zeta', path: '/tmp/z', group: 'Work', createdAt: 1 },
			{ id: '2', name: 'Alpha', path: '/tmp/a', group: 'Work', createdAt: 1 },
			{ id: '3', name: 'Bravo', path: '/tmp/b', group: 'Personal', createdAt: 1 }
		];

		const quickPickItems = buildProjectQuickPickItems(projects);
		assert.strictEqual(quickPickItems[0].label, 'Bravo');
		assert.strictEqual(quickPickItems[1].label, 'Alpha');
		assert.strictEqual(quickPickItems[2].label, 'Zeta');
	});

	test('resolves open-in-new-window behavior safely', () => {
		assert.strictEqual(resolveOpenInNewWindow(true, undefined), true);
		assert.strictEqual(resolveOpenInNewWindow(false, 'new'), true);
		assert.strictEqual(resolveOpenInNewWindow(false, 'current'), false);
		assert.strictEqual(resolveOpenInNewWindow(false, undefined), undefined);
	});
});
