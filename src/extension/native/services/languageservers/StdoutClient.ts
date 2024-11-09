import { createInterface, Interface } from 'readline';
import { ICommandClient } from "../../../web/types/types";
import { once } from 'events';
import { runSync } from '../../../downloader';
import { RunType, IResult, ICommand, CmdClientError } from "../../../web/types/types";
import * as child_process from 'child_process';
import { VscodeOutputChannelWrapper } from './channelWrapper';
import { ApplicationServices } from '../../../web/services/global';

import EventEmitter = require('events');

export abstract class BaseSpanClient implements ICommandClient {
    proc!: child_process.ChildProcess;
    private static count = 1; // restricts only stdserver or httpserver not both!!!!
    channel: VscodeOutputChannelWrapper;
    options: { pythonpath: string, stdargs: string[], type: RunType; }
    running: boolean = false;

    constructor(options: { pythonpath: string, stdargs: string[], type: RunType; }) {
        this.options = options;
        this.channel = ApplicationServices.get().getOutputChannelWrapper();
    }
    isRunning(): boolean {
        return this.running
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
        this.running = true;
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
        this.running = false;
    }

}



export class StdoutClient extends BaseSpanClient {
    rl!: Interface;
    eventS: EventEmitter = new EventEmitter();
    version: string = "unknown";
    running = true;

    constructor(options: { pythonpath: string; stdargs: string[]; type: RunType; }) {
        super(options);
    }

    start(): void {
        super.start();
        this.setup();
        this.healInstallation(this.options);
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
            try {
                const result: IResult = JSON.parse(line);
                this.eventS.emit(result.id + '', result);
            } catch (error) {
                console.log(`some rogue statemnt ${error}`)
            }
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
