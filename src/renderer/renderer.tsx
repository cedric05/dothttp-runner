/* eslint-disable @typescript-eslint/naming-convention */
import AceEditor from '@cedric05/preact-ace';
import "ace-builds/src-noconflict/ext-language_tools";
import modelList from 'ace-builds/src-noconflict/ext-modelist';
import 'ace-builds/src-noconflict/ext-searchbox';
import 'ace-builds/src-noconflict/mode-asciidoc';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-graphqlschema';
import 'ace-builds/src-noconflict/mode-haml';
import 'ace-builds/src-noconflict/mode-html';
import "ace-builds/src-noconflict/mode-java";
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-json5';
import 'ace-builds/src-noconflict/mode-jsoniq';
import 'ace-builds/src-noconflict/mode-jsx';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-plain_text';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-xml';
import 'ace-builds/src-noconflict/mode-yaml';
import "ace-builds/src-noconflict/theme-chrome";
import "ace-builds/src-noconflict/theme-monokai";
// import 'ace-builds/src-noconflict/theme-pastel_on_dark';
import { FunctionComponent, h } from 'preact';
import { useState } from 'preact/hooks';
import { v4 as uuidv4 } from 'uuid';
import {
    getReasonPhrase
} from 'http-status-codes';
import { json as jsonPretty, xml as xmlPretty } from 'vkbeautify';
import { RendererContext } from 'vscode-notebook-renderer';
import { DothttpExecuteResponse, MessageType, NotebookExecutionMetadata } from '../common/response';

type CountAndExistence = {
    exists: boolean,
    count: number | string
}

function arrayAndCount(arr: Array<any> | undefined): CountAndExistence {
    const tempArr = (arr ?? [])
    return {
        exists: tempArr.length > 0 ? true : false,
        count: tempArr.length
    } as CountAndExistence;
}

enum TabType {
    Response,
    Headers,
    RequestSent,
    TestResult,
    GeneratedProperties
}

export const Response: FunctionComponent<{ out: Readonly<{ response: DothttpExecuteResponse, metadata: NotebookExecutionMetadata }>, context: RendererContext<any> }> = ({ out, context }) => {
    const { response: props } = out
    // createStates
    const [activeIndex, setActive] = useState(0);

    // create keys
    const uuid = uuidv4()
    const saveButtonId = `save-button-${uuid}`;


    // retriveResponse
    const { headers } = props.response
    const { executionTime } = out.metadata
    let { body, url, status } = props.response
    const { filenameExtension, http: dothttpCode, script_result } = props
    let scriptLog = script_result?.stdout;
    if (!scriptLog) {
        scriptLog = "no log";
    }



    // format
    // contentUpdate
    // this is hack, sender should set it.
    if (filenameExtension === "json") {
        body = jsonPretty(body, '\t')
    } else if (filenameExtension == 'xml') {
        body = xmlPretty(body, '\t')
    }

    // response tab ace editor properties
    let darkMode = document.body.getAttribute('data-vscode-theme-kind')?.includes('dark') ?? false;
    let theme = darkMode ? "monokai" : "chrome"
    let mode = modelList.getModeForPath(`response.${filenameExtension}`).name;

    let testPass = 0;
    let testFail = 0;
    const testResult = script_result?.tests?.
        map(key => {
            if (key.success) testPass++; else testFail++;
            return ([key.name, key.success ? "✅" : "❌", key.result || key.error]);
        });

    const headerTab = arrayAndCount(Object.keys(headers ?? {}));
    const testResultTab = arrayAndCount(script_result?.tests);

    /*
    // show success and failure accordingly
    // commented out, as it is not looking good. upon more user exp, it may change
    if (testResultTab.exists) {
        if (testPass == 0) {
            testResultTab.count = `-${testFail}`
        }
        else if (testFail == 0) {
            testResultTab.count = `+${testPass}`
        } else {
            testResultTab.count = `+${testPass},-${testFail}`
        }
    }
    */

    const outputPropTab = arrayAndCount(Object.keys(script_result?.properties ?? {}));

    return <div>
        <br />
        <Status code={status} url={url} executionTime={executionTime} />
        <br />
        <div class='tab-bar'>
            <TabHeader activeTab={activeIndex} setActive={setActive}
                darkMode={darkMode}
                requestSentExists={dothttpCode ? true : false}
                headerTab={headerTab}
                testResultTab={testResultTab}
                outputPropTab={outputPropTab} />
            <span class='tab-bar-tools'>
                <button id={saveButtonId} class='search-button' title='Open In Editor' onClick={() => saveResponse(context, props, out.metadata)}>Open In Editor</button>
                <button id={`generate-lang-${uuid}`} class='search-button' title='Generate Language' onClick={() => generateLanguage(context, props, out.metadata)}>Generate Language</button>
            </span>
        </div>
        <br />
        <AceWrap data={body} mode={mode} active={activeIndex === TabType.Response} theme={theme}></AceWrap>
        <TableTab data={objectToDataGridRows(headers)} columns={["Header", "Value"]} active={headerTab.exists && activeIndex === TabType.Headers} />
        <TableTab data={testResult} columns={["Test Name", "Success", "Result"]} active={(testResultTab.exists && activeIndex === TabType.TestResult)} />
        <div class='tab-content' hidden={!(testResultTab.exists && activeIndex === TabType.TestResult)} >
            <strong><span class='key'>Script Log</span></strong>
            <pre>
                {scriptLog}
            </pre>
        </div>
        <TableTab data={objectToDataGridRows(script_result?.properties)} columns={["Property", "Value"]} active={outputPropTab.exists && activeIndex === TabType.GeneratedProperties} />
        <AceWrap data={dothttpCode} mode={'text'} active={(dothttpCode ? true : false) && activeIndex === TabType.RequestSent} theme={theme}></AceWrap>
    </div>;
};
const TabHeader: FunctionComponent<{
    activeTab: number, setActive: (i: number) => void,
    darkMode: boolean, requestSentExists: boolean,
    headerTab: CountAndExistence,
    testResultTab: CountAndExistence,
    outputPropTab: CountAndExistence
}> = ({ activeTab, setActive, headerTab: headers, requestSentExists, darkMode, testResultTab: testResult, outputPropTab: outputProps }) => {

    function pushIfExists(results: h.JSX.Element[], countAndExistence: CountAndExistence, tabHeading: string, activeTabNumber: TabType) {
        if (countAndExistence.exists) {
            // @ts-ignore
            results.push(<button class='tab' dark-mode={darkMode} onClick={() => setActive(activeTabNumber)} active={activeTab === activeTabNumber}>{tabHeading} <sup>{countAndExistence.count == 0 ? "" : `(${countAndExistence.count})`}</sup></button>);
        }
    };
    const renderTabHeaders = () => {
        let result: h.JSX.Element[] = [];
        pushIfExists(result, { exists: true, count: 0 }, "Data", TabType.Response);
        pushIfExists(result, headers, "Headers", TabType.Headers);
        pushIfExists(result, testResult, "Test Result", TabType.TestResult);
        pushIfExists(result, outputProps, "Generated Properties", TabType.GeneratedProperties);
        pushIfExists(result, { exists: requestSentExists, count: 0 }, "Request Sent", TabType.RequestSent);

        return result;
    };

    return <span>
        {renderTabHeaders()}
    </span>;
};

// reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
const Status: FunctionComponent<{ code: number, url: string, executionTime: string }> = ({ code, url, executionTime }) => {
    let statusType: string;
    if (code < 200) {
        statusType = 'info';
    } else if (code < 300) {
        statusType = 'success';
    } else if (code < 400) {
        statusType = 'redirect';
    } else if (code < 500) {
        statusType = 'client-err';
    } else if (code < 600) {
        statusType = 'server-err';
    }


    return <div class="status-and-url">
        <span className={`status-label status-label-${statusType!}`} >{code} {getReasonPhrase(code).toLowerCase()}</span>
        <span class='execution-summary' >{executionTime}s</span>
        <span class='request-url'>   {url}</span>
    </div>;
};


const AceWrap: FunctionComponent<{ data: string, active: boolean, theme: string, mode: string }> = ({ data, active, theme, mode }) => {

    let maxLines = data.split(/\r\n|\r|\n/).length + 2;
    return <div class='tab-content' id='data-container' hidden={!active}>
        <AceEditor
            placeholder="Empty Response from server"
            mode={mode}
            readOnly={true}
            theme={theme}
            name="blah2"
            width="100%"
            value={data}
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            setOptions={{
                useWorker: false,
                maxLines: maxLines,
                enableBasicAutocompletion: false,
                enableLiveAutocompletion: false,
                enableSnippets: false,
                showLineNumbers: true,
                tabSize: 2
            }}
        />
    </div>;
};

const TableTab: FunctionComponent<{ active: boolean, data: Array<Array<string>> | undefined, columns: Array<string> }> = ({ active, data, columns }) => {
    if (data)
        return <div class='tab-content' hidden={!active}>
            <table>
                <tr>
                    {columns.map(key => <th class="key column"><b>{key}</b></th>)}
                </tr>
                {data.map(row => <tr>
                    {row.map(d => <td class="key column">
                        {d}
                    </td>)}
                </tr>)}
            </table>
        </div>;
    else {
        return <div></div>
    }
};


function objectToDataGridRows(obj: Object | undefined): any {
    if (!obj) { return [] }
    return Object.entries(obj);
}

function saveResponse(context: RendererContext<any>, response: any, metadata: NotebookExecutionMetadata): void {
    // console.log(response);
    context.postMessage!({ "response": response, "metadata": metadata, "request": MessageType.save, })
}
function generateLanguage(context: RendererContext<any>, response: Readonly<DothttpExecuteResponse>, metadata: NotebookExecutionMetadata): void {
    context.postMessage!({ "response": response, "metadata": metadata, "request": MessageType.generate, })
}

