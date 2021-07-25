import * as vscode from 'vscode';
import * as path from 'path';

const vsparse = require("vs-parse");

let statusBarWorkbench: vscode.StatusBarItem;
let statusBarProject: vscode.StatusBarItem;
let statusBarConfig: vscode.StatusBarItem;

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
	let selectedCompiler = `${selectedIDE}\\toolchain\\arm\\arm-gnu-toolchain\\bin\\arm-none-eabi-gcc.exe`;
	let selectedConfiguration = "Debug";

	let configurations = project["Project"]["PropertyGroup"].slice(1);

	// Get the available configurations
	let configNames: string[] = [];
	for (let conf of configurations) {
		let configName = conf["$"]["Condition"].match("[^'\$\(Configuration\)' == '].*(?=')")[0];
		configNames.push(configName);
	}
	console.log(configNames);

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
		let miscFlags = toolchainSettings[`${compilerTag}.compiler.miscellaneous.OtherFlags`][0];
		cStandard = miscFlags.match("[^-std=].*[0-9]+")[0];
	}

	// Get C++ standard
	let cppStandard = "gnu++03";
	if (toolchainSettings.hasOwnProperty(`${compilerTag}cpp.compiler.miscellaneous.OtherFlags`)) {
		let miscFlags = toolchainSettings[`${compilerTag}cpp.compiler.miscellaneous.OtherFlags`][0];
		cppStandard = miscFlags.match("[^-std=].*[0-9]+")[0];
	}

	// let jsonObject: {
	// 	configurations: {
	// 		name: string,
	// 		includePath: string[],
	// 		defines: string[],
	// 		compilerPath: string,
	// 		cStandard: string,
	// 		cppStandard: string,
	// 		intelliSenseMode: string
	// 	}[],
	// 	version: number
	// };

	let jsonObject = {
		configurations: [
			{
				name: "MicrochipStudio",
				includePath: includePaths,
				defines: defines,
				compilerPath: selectedCompiler,
				cStandard: cStandard,
				cppStandard: cppStandard,
				intelliSenseMode: "windows-gcc-arm"
			}
		],
		version: 4
	};

	// let cppPropFile = vscode.Uri.file(`${vscode.workspace.workspaceFolders}/.vscode/c_cpp_properties.json`);
	let cppPropFile = vscode.Uri.file("D:\\_TEMP\\.vscode\\c_cpp_properties.json");
	vscode.workspace.fs.writeFile(cppPropFile, Buffer.from(JSON.stringify(jsonObject, null, '\t')));
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('Microchip Studio for VS Code is now active!');

	// let inputFile = vscode.Uri.file("D:\\Misc\\Development\\projects\\vs_code_extensions\\MicrochipStudioExamples\\SAML10 IO1 Xplained demo\\SAML10 IO1 Xplained demo C++\\SAML10 IO1 Xplained demo C++.cppproj");
	let inputFile = vscode.Uri.file("D:\\Misc\\Development\\projects\\vs_code_extensions\\MicrochipStudioExamples\\MEGA_LED_EXAMPLE1\\MEGA_LED_EXAMPLE1\\MEGA_LED_EXAMPLE1.cproj");

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

	addProject(inputFile);

	// register a command that is invoked when the status bar
	// item is selected
	const commandIdWorkbench = 'sample.showWorkbench';
	context.subscriptions.push(vscode.commands.registerCommand(commandIdWorkbench, () => {
		vscode.window.showInformationMessage(`Yeah, select the workbench!`);
	}));

	const commandIdProject = 'sample.showProject';
	context.subscriptions.push(vscode.commands.registerCommand(commandIdProject, () => {
		vscode.window.showInformationMessage(`Yeah, select the project!`);
	}));

	const commandIdConfig = 'sample.showConfig';
	context.subscriptions.push(vscode.commands.registerCommand(commandIdConfig, () => {
		vscode.window.showInformationMessage(`Yeah, select the configuration!`);
	}));

	// create a new status bar item that we can now manage
	statusBarWorkbench = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4);
	statusBarWorkbench.command = commandIdWorkbench;
	context.subscriptions.push(statusBarWorkbench);

	statusBarWorkbench.text = `Select Workbench`;
	statusBarWorkbench.show();

	// create a new status bar item that we can now manage
	statusBarProject = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3);
	statusBarProject.command = commandIdProject;
	context.subscriptions.push(statusBarProject);

	statusBarProject.text = `Select Project`;
	statusBarProject.show();

	// create a new status bar item that we can now manage
	statusBarConfig = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
	statusBarConfig.command = commandIdConfig;
	context.subscriptions.push(statusBarConfig);

	statusBarConfig.text = `Select Configuration`;
	statusBarConfig.show();
}

export function deactivate() {}
