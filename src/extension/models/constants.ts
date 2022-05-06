
export enum Constants {
	// to notify, these all should be in caps
	LANG_CODE = 'dothttp-vscode',

	// configs
	pythonPath = "dothttp.conf.pythonpath",
	dothttpPath = "dothttp.conf.path",
	experimental = "dothttp.conf.experimental",
	nocookie = "dothttp.conf.nocookie",
	history = "dothttp.conf.history",
	showheaders = "dothttp.conf.showheaders",
	runConf = "dothttp.conf.runrecent",
	reUseOldTab = "dothttp.conf.run.reuseold",
	responseDirectory = "dothttp.conf.response.savedirectory",
	CONFIG_DOTHTTP_USE_STABLE = "dothttp.conf.useunstable",
	// view props
	// commands
	RUN_FILE_COMMAND = 'dothttp.command.run',
	GEN_CURL_FILE_COMMAND = 'dothttp.command.gencurl',
	toggleExperimentalCommand = "dothttp.command.toggle.experimental",
	toggleHistoryCommand = "dothttp.command.toggle.history",
	toggleNocookieCommand = "dothttp.command.toggle.nocookie",
	toggleHeadersCommand = "dothttp.command.toggle.showheaders",
	toggleReuseTabCommand = "dothttp.command.toggle.runrecent",
	toggleRunRecentCommand = "dothttp.command.toggle.reuse",
	COMMAND_TOGGLE_UNSTABLE = "dothttp.command.toggle.unstable",
	IMPORT_RESOURCE_COMMAND = "dothttp.command.import.external",
	EXPORT_RESOURCE_COMMAND = "dothttp.command.export.postman",
	GENERATE_PROG_LANG_COMMAND = "dothttp.command.generatelang",
	RESTART_CLI_COMMAND = "dothttp.command.restartcli",
	RUN_NOTEBOOK_TARGET_IN_CELL = "dothttp.command.codelens.notebook.run",
	RUN_TARGET_CODE_LENS = "dothttp.command.text.run",
	REVEAL_HISTORY_VIEW = "dothttp.command.openVariableView",

	HTTPBOOK_SAVE_AS_HTTP = "dothttp.command.notebook.tohttpfile",

    NOTEBOOK_CELL_GEN_CURL = "dothttp.command.notebook.gencurl",
    NOTEBOOK_CELL_GEN_PROGRAM = "dothttp.command.notebook.prog",
	
    HTTP_AS_HTTPBOOK = "dothttp.command.openAsHttpBook",
	NEW_NOTEBOOK_COMMAND = "dothttp.command.newHttpBook",
	NEW_HTTP_FILE_COMMAND = "dothttp.command.newHttpFile",


	//    env tree
	envTreeView = 'dothttpEnvView',


	// history tree
	dothttpHistory = "dothttpHistory",

	refreshEnvCommand = 'dothttpEnvView.refresh',
	enableEnvCommand = 'dothttpEnvView.enableenv',
	disableEnvCommand = 'dothttpEnvView.disableenv',
	copyEnvValueCommand = 'dothttpEnvView.copyPropertyValue',
	openEnvFileCommmand = 'dothttpEnvView.opendothttpjson',
	disableAllEnvCommmand = "dothttpEnvView.disableAllEnv",


	enableEnvViewVar = 'dothttpEnvViewEnabled',


	notebookscheme = "vscode-notebook-cell",

	// proptree
	propTreeView = 'dothttpPropView',

	addPropCommand = 'dothttpPropView.add',
	enablePropCommand = 'dothttpPropView.enableproperty',
	disablePropCommand = 'dothttpPropView.disableproperty',
	copyEnvPropCommand = 'dothttpPropView.copyPropertyValue',
	updatePropCommand = 'dothttpPropView.updateproperty',
	removePropCommand = "dothttpPropView.removeproperty",
	disableAllPropCommand = "dothttpPropView.disableAllProperties",
	// tree vars
	propViewEnabled = "dothttpPropViewEnabled",

	EXTENSION_RUN_MODE = "dothttpRunMode",


	NOTEBOOK_MIME_TYPE = "x-application/dotbook",


	NOTEBOOK_ID = 'dothttp-book',

	// download stuff
	EXTENSION_VERSION = "0.0.44",

	dothttpNotebook = "dothttp-book",

	dothttpVersion = "dothttp.version",

	versionApi = "https://raw.githubusercontent.com/cedric05/dothttp-runner/VERSION/version.json",
	SECRET_POSTMAN_API_KEY = "POSTMAN_API_KEY",
	
}
