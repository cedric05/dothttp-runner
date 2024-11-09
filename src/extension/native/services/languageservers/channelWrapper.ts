import * as vscode from 'vscode'
import { Configuration } from '../../../web/utils/config';

export class VscodeOutputChannelWrapper {
    channel: vscode.OutputChannel;
    config: Configuration;

    constructor(config: Configuration) {
        this.channel = vscode.window.createOutputChannel('Dothttp');
        this.config = config
    }

    appendLine(line: string) {
        if (!this.config.isDiagnosticsEnabled)
            return;
        this.channel.appendLine(line);
    }

    clear() {
        this.channel.clear();
    }
}
