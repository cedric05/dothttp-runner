export interface DothttpRunOptions {
    noCookie?: boolean;
    experimental?: boolean;
    env?: string[];
    propertyFile?: String;
    curl: boolean;
    file: string;
    target?: string;
    properties?: {
        [prop: string]: string;
    };
}
