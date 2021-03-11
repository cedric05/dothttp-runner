
export enum Constants {

    langCode = 'dothttp-vscode',

    // configs
    pythonPath = "dothttp.conf.pythonpath",
    dothttpPath = "dothttp.conf.path",
    experimental = "dothttp.conf.experimental",
    nocookie = "dothttp.conf.nocookie",
    history = "dothttp.conf.history",
    curl = "dothttp.conf.curl",
    showheaders = "dothttp.conf.showheaders",
    // view props

    // commands
    runFileCommand = 'dothttp.command.run',
    genCurlForFileCommand = 'dothttp.command.gencurl',
    toggleExperimentalCommand = "dothttp.command.toggle.experimental",
    toggleHistoryCommand = "dothttp.command.toggle.history",
    toggleNocookieCommand = "dothttp.command.toggle.nocookie",
    toggleHeadersCommand = "dothttp.command.toggle.showheaders",
    importCommand = "dothttp.command.import.external",

    //    env tree
    envTreeView = 'dothttpEnvView',


    // history tree
    dothttpHistory = "dothttpHistory",

    refreshEnvCommand = 'dothttpEnvView.refresh',
    enableEnvCommand = 'dothttpEnvView.enableenv',
    disableEnvCommand = 'dothttpEnvView.disableenv',
    copyEnvValueCommand = 'dothttpEnvView.copyPropertyValue',
    openEnvFileCommmand = 'dothttpEnvView.opendothttpjson',

    enableEnvViewVar = 'dothttpEnvViewEnabled',


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

    // download stuff
    extensionVersion = "0.0.5",

    dothttpVersion = "dothttp.version",

    versionApi = "https://raw.githubusercontent.com/cedric05/dothttp-runner/VERSION/version.json"
}
