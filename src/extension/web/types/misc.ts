import { MarkdownString, Uri } from "vscode";

export interface DothttpRunOptions {
    noCookie?: boolean,
    experimental?: boolean,
    env?: string[],
    propertyFile?: Uri,
    curl: boolean
    file: string,
    target?: string,
    contexts?: Array<string>,
    properties?: { [prop: string]: string },
}



export enum DothttpTypes {
    NAME = "name",
    EXTRA_ARGS = "extra_args",
    URL = "url",
    BASIC_AUTH = "basic_auth",
    DIGEST_AUTH = "digest_auth",
    NTLM_AUTH = "ntlm_auth",
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
    COMMENT = "comment",
    IMPORT = "import",
    AWSAUTH = "aws_auth"
}

type Immutable<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
}

export const DotHovers = {
    // TODO add documentation link
    "name": new MarkdownString(`Unique Identifier incase of multiple httpdef in single file

visit naming [docs](https://docs.dothttp.dev/docs/multidef#definenaming)

extend targets like below

\`@name('auth')\`

\`@name('getdata'): 'auth'\`

visit extend [extend](https://docs.dothttp.dev/docs/extend)

`
    ),
    "extra_args": new MarkdownString(`Extra request modifier, such allow insecure, clear session after request

\`@insecure\` : allows self signed certificates

\`@clear\` : clears session

visit [docs](https://docs.dothttp.dev/docs/flags)`),
    "url": new MarkdownString(`Url of httpdef

1. name (Opitonal) \`@name\`
1. flags(@insecure/@clear) (Optional) \`@insecure\`, \`@clear\`
1. Url (required)
1. basicauth/digestauth (Optional) \`basicauth\`, \`digestauth\`, \`ntlmauth\`, \`awsauth\`, \`azurecli/azurespsecret/azurespcert\`
1. certificate (Optional) \`certificate(cert="", key="")\` or \`certificate(cert="")\` or  \`p12(file="", password="")\`
1. headers (Optional) \`Authorization: "secretkey"\`
1. urlparams (Optional) \`? page = 20\`
1. payload (Optional)  \`data("some")\`, \`json({"a":"b"})\` , \`urlencode({"a":"b"})\`, \`files( (key, value), ..)\`, \`fileinput("path to file")\`
1. script (Optional)
    
`),
    "ntlm_auth": new MarkdownString(`Configured with HttpDef Basic authentication mechanism

example:
\`ntlmauth("<username>", "<password>")\`

visit [docs](https://docs.dothttp.dev/docs/auth/#ntlm-authentication)

`),
    "hawk_auth": new MarkdownString(`Configured with HttpDef Hawk authentication mechanism

example:
\`hawkauth("<id>", "<key>", "<algorithm> (optional)")\`

The 'id' is the identifier of the client, 'key' is the shared secret used for generating the authentication code, and 'algorithm' is the hash algorithm used (e.g., 'sha256').

visit [docs](https://docs.dothttp.dev/docs/auth#hawk-authentication)`),
    "azure_auth": new MarkdownString(`Configured with HttpDef Azure authentication mechanism

example:
\`azurecli("scope(optional?)")\`

\`azurespsecret("tenant_id", "client_id", "client_secret", "scope (optional?)")\`

\`azurespcert("tenant_id", "client_id", "certificate_path", "scope (optional?)")\`

visit [docs](https://docs.dothttp.dev/docs/auth#azure-auth)
    `),
    "basic_auth": new MarkdownString(`Configured with HttpDef Basic authentication mechanism

example:
\`basicauth("<username>", "<password>")\`

visit [docs](https://docs.dothttp.dev/docs/auth#basic-authentication)

`),
    "aws_auth": new MarkdownString(`Configured with HttpDef AWS authentication mechanism
example: 
\`awsauth('dummy-access-id' , 'dummy-secret-token' , 's3', 'us-east-1')\`

visit [docs](https://docs.dothttp.dev/docs/auth#aws-signature-v4-authentication)
`),
    "digest_auth": new MarkdownString(`Configured with HttpDef Digest authentication mechanism

example:
\`digestauth("<username>", "<password>")\`

visit [docs](https://docs.dothttp.dev/docs/auth#digest-authentication)
`),
    "certificate": new MarkdownString(`Configured to use Certificate while making requests

example: \`certificate(cert="<certificate path>",key= "<privatekey path>")\`
\`or\`
p12(file="<certificate path>",password= "<password>")\`

visit [docs](https://docs.dothttp.dev/docs/certificates)
`),
    "header": new MarkdownString(`Header defined for httpdef

Syntax:
\`content-type: application/json\`

visit [docs](https://docs.dothttp.dev/docs/request-basics#headers)
`),
    "urlparams": new MarkdownString(`Urlparams of the request

example: 
\`\`\`
? key=value
? key2=value2
\`\`\`

visit [docs](https://docs.dothttp.dev/docs/request-basics#url-params)`),
    "payload_data": new MarkdownString(`Text Payload of the request (sets content-type to text/plain)

example:

\`text("this is payload")\`

or 

\`data("this is payload")\`
visit [docs](https://docs.dothttp.dev/docs/request-basics#text-payload)`),
    "payload_urlencoded": new MarkdownString(`UrlEncoded payload (sets content-type to urlformencoded)

example:

\`urlencoded({"key": "value"})\`

visit [docs](https://docs.dothttp.dev/docs/request-basics#urlencode)
`),
    "payload_file_input": new MarkdownString(`FileInput for the payload (sets content-type according to file type)

example:

\`< "<path to upload>"\`
// or
\`fileinput("<file path to upload>")\`
    
visit [docs](https://docs.dothttp.dev/docs/request-basics#binary)
`),
    "payload_json": new MarkdownString(`JsonPayload for the requset (sets content-type to application/json)
example:

\`json({"key": "value"})\`

visit [docs](https://docs.dothttp.dev/docs/request-basics#json-payload)`),
    "payload_multipart": new MarkdownString(`Multipart payload

example:
\`\`\`
multipart(
    "<key>" :  "<path to file or data>",
    "<key>" : "<path to file or data>" ; "<optional content-type>")
)
\`\`\`
visit [docs](https://docs.dothttp.dev/docs/request-basics#multipart)`),
    "output": new MarkdownString(`save Output in output filename

\`>> "<output file name>"\`

// or 

\`output("<output file name>")\`

`),
    "script": new MarkdownString(`Run Javascript script after execution of httpdef

\`> {% client.log("sample script") %}\`

visit [docs](https://docs.dothttp.dev/docs/scripts)`),
    "comment": new MarkdownString("Comment"),
    "import": new MarkdownString(`Import

    \`> {% import "./<filename.http>" %}\`
    
    visit [docs](https://docs.dothttp.dev/docs/import)`)
};
