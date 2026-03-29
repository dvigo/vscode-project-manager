import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	const expectedCommands = [
		'project-manager.addCurrentWorkspace',
		'project-manager.addFolder',
		'project-manager.openProject',
		'project-manager.openProjectInNewWindow',
		'project-manager.removeProject',
		'project-manager.refreshProjects',
		'project-manager.openProjectFromNode',
		'project-manager.removeProjectFromNode',
		'project-manager.renameGroup',
		'project-manager.renameGroupFromNode'
	];

	test('contributes expected commands', async () => {
		const extension = vscode.extensions.all.find((item) => item.packageJSON.name === 'simple-project-manager');
		assert.ok(extension, 'Development extension simple-project-manager was not found.');
		await extension?.activate();

		const commands = await vscode.commands.getCommands(true);

		for (const commandId of expectedCommands) {
			assert.ok(commands.includes(commandId), `Expected command not found: ${commandId}`);
		}
	});
});
