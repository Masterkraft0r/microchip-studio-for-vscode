import * as vscode from 'vscode';
import * as path from 'path';

const vsparse = require("vs-parse");

async function importSolution(solutionFile: vscode.Uri) {
	let solution = await vsparse.parseSolution(solutionFile.fsPath);
	// let basePath = 
	console.log(solutionFile.fsPath);
	console.log(solution);
	// TODO: create workspace object
	// let workspaceFile = vscode.window.showSaveDialog();
}

async function addProject(projectFile: vscode.Uri) {
	let project = await vsparse.parseProject(projectFile.fsPath);
	// let basePath = 
	console.log(project);
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('Microchip Studio for VS Code is now active!');
	let inputFiles = await vscode.window.showOpenDialog({canSelectFiles: true, canSelectFolders: false, canSelectMany: false});

	if (inputFiles === undefined) {
		throw new vscode.FileSystemError("No file has been chosen.");
	}

	let inputFile = inputFiles[0]; 

	context.subscriptions.push(
		vscode.commands.registerCommand('microchip-studio-for-vscode.open-solution',
			() => {
				importSolution(inputFile);
				// TODO: create workspace object
				// let workspaceFile = vscode.window.showSaveDialog();
			}
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('microchip-studio-for-vscode.open-project',
			() => {
				addProject(inputFile);
				// TODO: check if workspace is open
				// TODO: check if file is project
				// TODO: parse project
				// TODO: add folder to workspace
			}
		)
	);
}

export function deactivate() {}
