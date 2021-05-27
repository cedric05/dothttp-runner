
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
}