
export interface DothttpRunOptions {
    path: string;
    noCookie?: boolean,
    experimental?: boolean,
    env?: Array<String>,
    propertyFile?: String,
    curl: boolean
    file: string
    properties?: Array<string>,
}