
export interface DothttpRunOptions {
    path: string;
    noCookie?: boolean,
    experimental?: boolean,
    env?: Set<String>,
    propertyFile?: String,
    curl: boolean
    file: string
    properties?: Array<string>,
}