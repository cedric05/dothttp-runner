import axios, { AxiosResponse } from 'axios';
import * as child_process from 'child_process';
import { once } from 'events';
import { createInterface, Interface } from 'readline';
import { URL } from 'url';
import EventEmitter = require('events');

interface cmdServer {
    request(method: string, params: {}): Promise<{}>;
    stop(): void;
}

interface cmdRequest {
    method: string,
    id?: Number,
    params: {}
}


interface cmdResult {
    id: Number,
    result: {},
}

class CmdServerError extends Error {

}


abstract class BaseClient implements cmdServer {
    abstract stop(): void;
    private static count = 1; // restricts only stdserver or httpserver not both!!!!
    async request(method: string, params: {}): Promise<{}> {
        const id = BaseClient.count++;
        const result = await this.call({ method, params, id });
        if (result.id !== id) {
            throw new CmdServerError("id's are not same");
        }
        return result.result;
    }
    abstract call(command: cmdRequest): Promise<cmdResult>;
}

export class StdoutClient extends BaseClient {
    proc: child_process.ChildProcess;
    rl: Interface;
    eventS: EventEmitter = new EventEmitter();


    stop(): void {
        this.proc?.kill();
    }

    constructor(options: { pythonpath: string, stdargs: string[] }) {
        super();
        this.proc = child_process.spawn(options.pythonpath,
            options.stdargs,
            // { stdio: "inherit" }
        );
        this.rl = createInterface({
            input: this.proc.stdout!,
            terminal: false
        });
        this.rl.on("line", (line) => {
            const result: cmdResult = JSON.parse(line);
            this.eventS.emit(result.id + '', result);
        })
    }
    async call(command: cmdRequest): Promise<cmdResult> {
        const commandInString = JSON.stringify(command) + '\n';
        this.proc.stdin!.write(commandInString);
        console.log('prev');
        const result = await once(this.eventS, command.id + '');
        console.log('after');

        return result as unknown as cmdResult;
    }
}


export class HttpClient extends BaseClient {
    stop(): void {
        this.proc?.kill();
    }
    proc?: child_process.ChildProcess;
    constructor(options: { pythonpath: string, stdargs: string[] }) {
        super();
        this.proc = child_process.spawn(options.pythonpath,
            options.stdargs,
            {
                stdio: "inherit"
            }
        );
    }
    async call(command: cmdRequest): Promise<cmdResult> {
        const id = command.id;
        const axiosResponse: AxiosResponse<cmdResult> = await axios({
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
    cli: BaseClient;
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