import axios, { AxiosResponse } from 'axios';
import * as child_process from 'child_process';
import { once } from 'events';
import { createInterface, Interface } from 'readline';
import { URL } from 'url';
import EventEmitter = require('events');

interface ICommandClient {
    request(method: string, params: {}): Promise<{}>;
    stop(): void;
}

interface ICommand {
    method: string,
    id?: Number,
    params: {}
}


interface IResult {
    id: Number,
    result: {},
}

class CmdClientError extends Error {

}


abstract class BaseSpanClient implements ICommandClient {
    readonly proc: child_process.ChildProcessWithoutNullStreams;
    private static count = 1; // restricts only stdserver or httpserver not both!!!!

    constructor(options: { pythonpath: string, stdargs: string[] }){
        this.proc = child_process.spawn(options.pythonpath,
            options.stdargs,
        );
    }

    async request(method: string, params: {}): Promise<{}> {
        const id = BaseSpanClient.count++;
        const result = await this.call({ method, params, id });
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
    rl: Interface;
    eventS: EventEmitter = new EventEmitter();

    constructor(options: { pythonpath: string, stdargs: string[] }) {
        super(options);
        this.rl = createInterface({
            input: this.proc.stdout,
            terminal: false
        });
        // start readline to listen
        this.rl.on("line", (line) => {
            const result: IResult = JSON.parse(line);
            this.eventS.emit(result.id + '', result);
        })
    }
    async call(command: ICommand): Promise<IResult> {
        const commandInString = JSON.stringify(command) + '\n';
        this.proc.stdin!.write(commandInString);
        const results = await once(this.eventS, command.id + '');
        // once retruns multiple at a time.
        // technically you should recive only one.
        if (results.length > 1) throw new CmdClientError("inconsistant state");
        return results[0] as unknown as IResult;
    }
}


export class HttpClient extends BaseSpanClient {
    constructor(options: { pythonpath: string, stdargs: string[] }) {
        super(options);
    }
    async call(command: ICommand): Promise<IResult> {
        const id = command.id;
        const axiosResponse: AxiosResponse<IResult> = await axios({
            url: new URL(command.method, 'http://localhost:5000/').href,
            method: "POST",
            params: {
                id
            },
            data: command.params
        });
        return axiosResponse.data
    }
}


class ClientHandler {
    cli: BaseSpanClient;
    static executecommand = "/file/execute";
    constructor(options: { std: boolean, pythonpath: string, stdargs: string[] }) {
        if (options.std) {
            this.cli = new StdoutClient({ pythonpath: options.pythonpath!, stdargs: options.stdargs! });
        } else {
            this.cli = new HttpClient({ pythonpath: options.pythonpath!, stdargs: options.stdargs! });
        }
    }

    async execute(filename: string, options: {} = {}) {
        const result = await this.cli.request(ClientHandler.executecommand, { file: filename })
        console.log(result)
    }

    close() {
        this.cli.stop();
    }
}
