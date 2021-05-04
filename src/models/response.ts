import { ResponseHeaderField } from "./completiontypes";

export interface ResponseRendererElements {
    status: number,
    statusText: string,
    headers?: any | undefined,
    config?: any | undefined,
    request?: any | undefined,
    data: any
}

export class ResponseParser {
    private status: number | undefined;
    private statusText: string | undefined;
    private headers: any | undefined;
    private config: any | undefined;
    private request: any | undefined;
    private data: any | undefined;

    constructor(response: any, request: any) {
        let res = response;


        try {
            this.status = res.status;
            this.statusText = res.status;

            // cyclical reference so we need to cherry pick fields
            this.headers = {};

            for (const field of Object.values(ResponseHeaderField)) {
                this.headers[field] = res.headers[field.toLowerCase()];
            }

            this.config = {
                
            };



            this.request = {
                method: "FIX ME",
            };

            this.request = { ...this.request, ...request };

            this.data = res.body;
        } catch {
            throw new Error(response.message);
        }
    }

    json() {
        return {
            status: this.status,
            statusText: this.statusText,
            headers: this.headers,
            config: this.config,
            request: this.request,
            data: this.data
        };
    }

    html() {
        return this.data;
    }

    renderer(): ResponseRendererElements {
        if (!this.status || !this.statusText || !this.data) {
            throw new Error("Corrupt response received! Missing one or more of response status, status text, and/or data!");
        }

        return {
            status: this.status!,
            statusText: this.statusText!,
            headers: this.headers,
            config: this.config,
            request: this.request,
            data: this.data!
        };
    }
}