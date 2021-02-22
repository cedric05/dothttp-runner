
export interface DothttpRunOptions {
    path: string;
    noCookie?: boolean,
    experimental?: boolean,
    env?: string[],
    propertyFile?: String,
    curl: boolean
    file: string,
    target?: string,
    properties?: Array<string>,
}