import { string } from 'prop-types';
import * as vscode from 'vscode';
import { Constants } from './constants';

// TODO
// instead of check configuration everytime, 
// keep a private copy and listener when ever property changes, update

export class Configuration {
    static getConfiguredValue(key: string) {
        return vscode.workspace.getConfiguration().get(key) as string;
    }

    static setGlobalValue(key: string, value: string) {
        return vscode.workspace.getConfiguration().update(key, value, vscode.ConfigurationTarget.Global);
    }

    // isConfiguredPathCorrect?
    static getPath(): string {
        return Configuration.getConfiguredValue(Constants.pythonPath) as unknown as string;
    }

    static getDothttpPath(): string {
        return Configuration.getConfiguredValue(Constants.dothttpPath) as unknown as string;
    }

    static setDothttpPath(value: string) {
        if (!vscode.env.remoteName){
            return Configuration.setGlobalValue(Constants.dothttpPath, value);
        }
    }

    static get isToUseUnStable() {
        return vscode.workspace.getConfiguration().get(Constants.CONFIG_DOTHTTP_USE_STABLE) as boolean;
    }

    static get agent(){
        return vscode.workspace.getConfiguration().get(Constants.CONFIG_HTTP_AGENT) as string;
    }


    reUseOld = false;
    runRecent = false;
    showHeaders = false;
    noCookies = false;
    isExperimental = false;
    history = true;
    configchange = vscode.workspace.onDidChangeConfiguration(() => this.update());
    pythonPath!: string;
    dothttpPath!: string;
    responseSaveDirectory!: string;
    agent!: string;


    private constructor() {
        this.preset();
    }

    preset() {
        const vsCodeconfig = vscode.workspace.getConfiguration();
        this.reUseOld = vsCodeconfig.get(Constants.reUseOldTab) as boolean;
        this.runRecent = vsCodeconfig.get(Constants.runConf) as boolean;
        this.showHeaders = vsCodeconfig.get(Constants.showheaders) as boolean;
        this.noCookies = vsCodeconfig.get(Constants.nocookie) as boolean
        this.pythonPath = vsCodeconfig.get(Constants.pythonPath) as string;
        this.dothttpPath = vsCodeconfig.get(Constants.dothttpPath) as string;
        this.responseSaveDirectory = vsCodeconfig.get(Constants.responseDirectory) as string;
        this.history = vsCodeconfig.get(Constants.history) as boolean;
        this.agent = vsCodeconfig.get(Constants.CONFIG_HTTP_AGENT) as string;
    }

    public update() {
        this.preset();
    }


    private static _config: Configuration;
    static instance() {
        if (Configuration._config) {
            return Configuration._config;
        }
        Configuration._config = new Configuration();
        return Configuration._config;
    }

}