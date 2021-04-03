import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { extensions, Uri } from 'vscode';
const rangeTestData = require('./rangeTestData.json');
const testData = require('./testData.json');

// import * as myExtension from '../../extension';


const directory: string = path.join(__dirname, "..", "..", "..", "test-resources");
const filename = path.join(directory, "multidef.http")
const failFilename = path.join(directory, "fail.http")

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	const fileUri = Uri.file(path.join(filename));
	const failFileUri = Uri.file(path.join(failFilename));

	suiteSetup(async function () {
		await extensions.getExtension('shivaprasanth.dothttp-code')!.activate();
		await vscode.window.showTextDocument(fileUri);
	});

	test("outline should be present", async () => {
		const out = await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", fileUri) as vscode.SymbolInformation[];
		const processed = out.map(a => ({ name: a.name, kind: a.kind, location: { range: a.location.range }, containerName: a.containerName }));
		assert.strictEqual(JSON.stringify(processed), JSON.stringify(testData));
	})

	test("should provide code lens", async () => {
		const out = await vscode.commands.executeCommand("vscode.executeCodeLensProvider", failFileUri);
		assert.strictEqual(JSON.stringify(out), JSON.stringify(rangeTestData));
	})


	// test("should execute and open response result", async () => {
	// 	return // skipping
	// 	const args = { target: "first" }
	// 	//close all windows first
	// 	await vscode.window.showTextDocument(failFileUri);
	// 	await Promise.all(vscode.window.visibleTextEditors.map(async editor => {
	// 		editor.hide();
	// 	}));
	// 	await vscode.commands.executeCommand(Constants.runFileCommand, args, args, args);
	// 	if (vscode.window.visibleTextEditors.filter(edtior => edtior.document.uri.scheme === "untitled").length === 1) {
	// 		return;
	// 	}
	// 	assert.fail("not executed")
	// })
});


async function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	})
};

