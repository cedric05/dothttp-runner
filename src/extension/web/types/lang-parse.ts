export interface Targets {
    [target: string]: HttpTargetDef;
}

export interface HttpTargetDef {
    method: string;
    url: string;
    payload?: Payload;
    headers: Header[];
    query: Header[];
    name: string;
}

export interface Header {
    name: string;
    value: string;
}

export interface Payload {
    text: string;
    mimeType: string;
    params: Param[];
}

export interface Param {
    name: string;
    fileName?: string;
    contentType: string;
    value?: string;
}

export interface HttpFileTargetsDef {
    target: Targets;
    error: boolean
}
