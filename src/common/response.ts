
export interface Headers {
    [key: string]: string
}

export interface Response {
    contentType?: string;
    headers: Headers | undefined;
    body: string;
    status: number;
    url: string;
}


export interface DothttpExecuteResponse {
    headers: Headers;
    body: string;
    status: number;
    url: string;
    response: Response;
    http: string;
    error?: boolean;
    error_message?: string;
    script_result: ScriptResult
}

export interface ScriptResult {
    stdout: string;
    error: string;
    properties: { [propname: string]: string };
    tests: Test[];
    compiled: boolean;
}



export interface Test {
    name: string;
    success: boolean;
    result: string;
}
