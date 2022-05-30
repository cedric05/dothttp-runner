import { createInterface, Interface } from 'readline';
import { ICommandClient } from "../types";
import { once } from 'events';
import { runSync } from '../../downloader';
import { RunType, IResult, ICommand, CmdClientError } from "../types";
import * as child_process from 'child_process';
import * as vscode from 'vscode'

import EventEmitter = require('events');



export abstract class BaseSpanClient implements ICommandClient {
    proc!: child_process.ChildProcess;
    private static count = 1; // restricts only stdserver or httpserver not both!!!!
    channel: vscode.OutputChannel;
    options: { pythonpath: string, stdargs: string[] }

    constructor(options: { pythonpath: string, stdargs: string[] }) {

        this.options = options;
        this.channel = vscode.window.createOutputChannel('dothttp-code');
    }
    start(): void {
        this.proc = child_process.spawn(this.options.pythonpath,
            this.options.stdargs,
            {
                stdio: ["pipe", "pipe", "inherit"],
                // not sure why, totally unrelated to latest changes, but started opening in new window
                detached: true
            },
        );
    }
    isSupportsNative(): boolean {
        return true;
    }

    async request(method: string, params: {}): Promise<any> {
        const id = BaseSpanClient.count++;
        const requestData = { method, params, id };
        this.channel.appendLine(JSON.stringify(requestData));
        const result = await this.call(requestData);
        this.channel.appendLine(JSON.stringify(result));
        if (result.id !== id) {
            throw new CmdClientError("id's are not same");
        }
        return result.result;
    }
    abstract call(command: ICommand): Promise<IResult>;

    stop(): void {
        this.proc.kill();
    }

}



export class StdoutClient extends BaseSpanClient {
    rl!: Interface;
    eventS: EventEmitter = new EventEmitter();
    version: string = "unknown";

    constructor(options: { pythonpath: string; stdargs: string[]; type: RunType; }) {
        super(options);
        this.setup();
        this.healInstallation(options);

        once(this.eventS, "-1").then(result => {
            if (result.length != 1) {
                console.log('unknown dothttp cli');
            } else {
                this.version = result[0].result.dothttp_version;
                console.log(`detected dothttp cli with version: ${this.version}`);
            }
        });

    }
    private setup() {
        this.rl = createInterface({
            input: this.proc.stdout!,
            terminal: false
        });
        // start readline to listen
        this.rl.on("line", (line) => {
            const result: IResult = JSON.parse(line);
            this.eventS.emit(result.id + '', result);
        });
    }

    async call(command: ICommand): Promise<IResult> {
        const commandInString = JSON.stringify(command) + '\n';
        this.proc.stdin!.write(commandInString);
        const results = await once(this.eventS, command.id + '');
        // once retruns multiple at a time.
        // technically you should recive only one.
        if (results.length > 1)
            throw new CmdClientError("inconsistant state");
        return results[0] as unknown as IResult;
    }


    async healInstallation(options: { pythonpath: string; stdargs: string[]; type: RunType; }) {
        if (
            // @ts-ignore
            !this.proc.pid) {
            if (options.type === RunType.python) {
                // install
                await runSync(options.pythonpath, ["-m", "pip", "install", 'dothttp-req']);
                this.proc = child_process.spawn(options.pythonpath, options.stdargs,
                    { stdio: ["pipe", "pipe", "inherit"] });
                this.setup();
            }
        }
    }

}
