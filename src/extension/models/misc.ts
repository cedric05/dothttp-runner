import { MarkdownString } from "vscode";

export interface DothttpRunOptions {
    noCookie?: boolean,
    experimental?: boolean,
    env?: string[],
    propertyFile?: String,
    curl: boolean
    file: string,
    target?: string,
    properties?: { [prop: string]: string },
}



export enum DothttpTypes {
    NAME = "name",
    EXTRA_ARGS = "extra_args",
    URL = "url",
    BASIC_AUTH = "basic_auth",
    DIGEST_AUTH = "digest_auth",
    CERTIFICATE = "certificate",
    HEADER = "header",
    URL_PARAMS = "urlparams",
    PAYLOAD_DATA = "payload_data",
    PAYLOAD_ENCODED = "payload_urlencoded",
    PAYLOAD_FILE = "payload_file_input",
    PAYLOAD_JSON = "payload_json",
    PAYLOAD_MULTIPART = "payload_multipart",
    OUTPUT = "output",
    SCRIPT = "script",
    COMMENT = "comment"
}

type Immutable<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
}

export const DotHovers = {
    // TODO add documentation link
    "name": new MarkdownString(`Unique Identifier incase of multiple httpdef in single file

visit https://docs.dothttp.dev/docs/multidef#definenaming`
),
    "extra_args": new MarkdownString(`Extra request modifier, such allow insecure, clear session after request

visit https://docs.dothttp.dev/docs/flags`),
    "url": new MarkdownString("Url of httpdef"),
    "basic_auth": new MarkdownString("Configured with HttpDef Basic authentication mechanism"),
    "digest_auth": new MarkdownString("Configured with HttpDef Digest authentication mechanism"),
    "certificate": new MarkdownString(`Configured to use Certificate while making requests

visit https://docs.dothttp.dev/docs/certificates
`),
    "header": new MarkdownString("Header defined for httpdef"),
    "urlparams": new MarkdownString(`Urlparams of the request

visit https://docs.dothttp.dev/docs/request-basics#url-params`),
    "payload_data": new MarkdownString(`Text Payload of the request
    
visit https://docs.dothttp.dev/docs/request-basics#example-2-text-payload`),
    "payload_urlencoded": new MarkdownString(`UrlEncoded payload
    
visit https://docs.dothttp.dev/docs/request-basics#example-4-urlencode
`),
    "payload_file_input": new MarkdownString(`FileInput for the payload
 
visit https://docs.dothttp.dev/docs/request-basics#binary
`),
    "payload_json": new MarkdownString(`JsonPayload for the requset

visit https://docs.dothttp.dev/docs/request-basics#example-3-json-payload`),
    "payload_multipart": new MarkdownString(`Multipart payload

visit https://docs.dothttp.dev/docs/request-basics#multipart`),
    "output": new MarkdownString("save Output in output filename"),
    "script": new MarkdownString(`Run Javascript script after execution of httpdef

visit https://docs.dothttp.dev/docs/scripts`),
    "comment": new MarkdownString("Comment"),
};
