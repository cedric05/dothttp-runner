import axios, { AxiosResponse } from 'axios';
import { ICommandClient, ICommand, IResult } from '../types';
import * as vscode from 'vscode'


export class HttpClient implements ICommandClient {
    id: number = 0;
    url: string;
    channel: vscode.OutputChannel;

    constructor(url: string = 'http://localhost:5000',) {
        this.id = 0;
        this.url = url;
        this.channel = vscode.window.createOutputChannel('dothttp-code');
    }
    start(): void {
        throw new Error('Method not implemented.');
    }

    isSupportsNative(): boolean {
        return false;
    }
    async request(method: string, params: {}): Promise<any> {
        const requestData = { method, params, id: this.id };
        this.channel.appendLine(JSON.stringify(requestData));
        const result = await this.call(requestData);
        this.channel.appendLine(JSON.stringify(result));
        this.id++;
        return result.result;
    }
    stop(): void {
        console.log('unsupported for http client');
    }
    async call(command: ICommand): Promise<IResult> {
        const id = command.id;
        const axiosResponse: AxiosResponse<IResult> = await axios({
            url: `${this.url}/${command.method}`,
            method: "POST",
            params: {
                id
            },
            data: command.params
        });
        return axiosResponse.data;
    }
}
