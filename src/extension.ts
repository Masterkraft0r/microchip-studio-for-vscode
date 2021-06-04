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
	const xml2js = require("xml2js");

	let parser = new xml2js.Parser();
	let data = await vscode.workspace.fs.readFile(projectFile);
	let project = await parser.parseStringPromise(data);
	console.log(project);

	let selectedIDE = "C:\\Program Files (x86)\\Atmel\\Studio\\7.0";
	let selectedConfiguration = "Debug";
	let configurations = project["Project"]["PropertyGroup"].slice(1);

	// Get the toolchain settings
	let toolchainSettings: any;
	let compilerTag = "avrgcc";
	for (let conf of configurations) {
		let cond: string = conf["$"]["Condition"];
		if (cond.indexOf(selectedConfiguration) >= 0) {
			let settingName = Object.keys(conf["ToolchainSettings"][0])[0];
			toolchainSettings = conf["ToolchainSettings"][0][settingName][0];
			if ((settingName === "ArmGcc") || (settingName === "ArmGccCpp")) {
				compilerTag = "armgcc";
			}
			break;
		}
	}
	console.log(toolchainSettings);

	// Get include paths
	let includePaths: string[] = toolchainSettings[`${compilerTag}.compiler.directories.IncludePaths`][0]["ListValues"][0]["Value"];
	includePaths = includePaths
		.map((elem: string) => {
			return elem.split("\\")
				.filter((elem) => {
					return elem !== "";
				})
				.join("/");
		})
		.map((elem: string) => {
			if (elem.startsWith("../")) {
				return elem.replace("../", "${workspaceFolder}/");
			}
			else if (elem.startsWith("%24(PackRepoDir)/")) {
				return elem.replace("%24(PackRepoDir)/", selectedIDE + "/");
			}
			return elem;
		});

	// Get defines and MCU name
	let defines: string[] = toolchainSettings[`${compilerTag}.compiler.symbols.DefSymbols`][0]["ListValues"][0]["Value"];
	let mcu = project["Project"]["PropertyGroup"][0]["avrdevice"][0];
	if (mcu.indexOf("SAM") >= 0) {
		defines.push(`__${mcu}__`);
	}
	else {
		defines.push(`__AVR_${mcu}__`);
	}

	// Get C standard
	let cStandard = "gnu99";
	if (toolchainSettings.hasOwnProperty(`${compilerTag}.compiler.miscellaneous.OtherFlags`)) {
		let miscFlags = toolchainSettings[`${compilerTag}cpp.compiler.miscellaneous.OtherFlags`][0];
		cStandard = miscFlags.match("[^-std=].*[0-9]+")![0];
	}

	// Get C++ standard
	let cppStandard = "gnu++03";
	if (toolchainSettings.hasOwnProperty(`${compilerTag}cpp.compiler.miscellaneous.OtherFlags`)) {
		let miscFlags = toolchainSettings[`${compilerTag}cpp.compiler.miscellaneous.OtherFlags`][0];
		cppStandard = miscFlags.match("[^-std=].*[0-9]+")![0];
	}

}

export async function activate(context: vscode.ExtensionContext) {
	console.log('Microchip Studio for VS Code is now active!');

	context.subscriptions.push(
		vscode.commands.registerCommand('microchip-studio-for-vscode.open-solution',
			async () => {
	let inputFiles = await vscode.window.showOpenDialog({canSelectFiles: true, canSelectFolders: false, canSelectMany: false});

	if (inputFiles === undefined) {
		throw new vscode.FileSystemError("No file has been chosen.");
	}

	let inputFile = inputFiles[0]; 

				importSolution(inputFile);
				// TODO: create workspace object
				// let workspaceFile = vscode.window.showSaveDialog();
			}
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('microchip-studio-for-vscode.open-project',
			async () => {
				let inputFiles = await vscode.window.showOpenDialog({canSelectFiles: true, canSelectFolders: false, canSelectMany: false});

				if (inputFiles === undefined) {
					throw new vscode.FileSystemError("No file has been chosen.");
				}

				let inputFile = inputFiles[0]; 

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
