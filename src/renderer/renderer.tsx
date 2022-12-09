/* eslint-disable @typescript-eslint/naming-convention */
import * as ClearAll from '@vscode/codicons/src/icons/clear-all.svg';
import * as LinkExternal from '@vscode/codicons/src/icons/code.svg';
import * as OpenInEditor from '@vscode/codicons/src/icons/open-preview.svg';

import { getReasonPhrase } from 'http-status-codes';
// import 'ace-builds/src-noconflict/theme-pastel_on_dark';
import { FunctionComponent, h } from 'preact';
import { useState } from 'preact/hooks';
import { v4 as uuidv4 } from 'uuid';
import { json as jsonPretty, xml as xmlPretty } from 'vkbeautify';
import { RendererContext } from 'vscode-notebook-renderer';
import { DothttpExecuteResponse, MessageType, NotebookExecutionMetadata } from '../common/response';
const { HighLight } = require('preact-highlight');



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
    RawResponse,
    Headers,
    RequestSent,
    TestResult,
    GeneratedProperties,
    RedirectHistory,
}

const MAX_DEFAULT_FORMAT_LEN = 2 * 1024 * 1024;

export const Response: FunctionComponent<{ out: Readonly<{ response: DothttpExecuteResponse, metadata: NotebookExecutionMetadata }>, context: RendererContext<any> }> = ({ out, context }) => {
    const { response: props } = out
    // createStates
    const [activeIndex, setActive] = useState(TabType.Response);

    // create keys
    const uuid = uuidv4()
    const saveButtonId = `save-button-${uuid}`;


    // retriveResponse
    const { headers, url, status } = props.response
    const { executionTime } = out.metadata
    let { body, output_file } = props.response
    const { filenameExtension, http: dothttpCode, script_result, history } = props


    if (body.length < MAX_DEFAULT_FORMAT_LEN) {
        body = formatBody(filenameExtension, body);
    }
    let redirectHistory = ""
    if (history) {
        redirectHistory = formatBody('json', JSON.stringify(history));
    }
    const [responseBody, setResponseBody] = useState(body);

    let scriptLog = `${script_result?.stdout}\n${script_result?.error}`;
    if (!(script_result?.stdout || script_result?.error)) {
        scriptLog = "no log";
    }



    // format
    // contentUpdate
    // this is hack, sender should set it.

    // response tab ace editor properties
    let darkMode = document.body.getAttribute('data-vscode-theme-kind')?.includes('dark') ?? false;
    let theme = darkMode ? "monokai-sublime" : "googlecode"
    let mode = filenameExtension ?? "json";

    // let testPass = 0;
    // let testFail = 0;
    const testResult = script_result?.tests?.
        map(key => {
            // if (key.success) testPass++; else testFail++;
            return ([key.name, key.success ? "✅" : "❌", key.result || key.error]);
        });

    const headerTab = arrayAndCount(Object.keys(headers ?? {}));
    const testResultTab = arrayAndCount(script_result?.tests);
    testResultTab.exists = testResultTab.exists || Boolean(script_result?.stdout) || Boolean(script_result?.error);
    const responseTab: CountAndExistence = { exists: true, count: output_file ? 1 : 0 }

    const redirectHistoryTab: CountAndExistence = arrayAndCount(history)

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
    console.log(output_file);

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
                outputPropTab={outputPropTab} responseTabMeta={responseTab} redirectHistoryTab={redirectHistoryTab} />
            <span class='tab-bar-tools'>
                <button id={`format-${uuid}`} class='search-button' title='Format'
                    onClick={() => setResponseBody(formatBody(filenameExtension, responseBody))}>Beautify <Icon name={ClearAll} /></button>
                <button id={saveButtonId} class='search-button' title='Open In Editor'
                    onClick={() => saveResponse(context, props, out.metadata)}>Open In Editor <Icon name={OpenInEditor} /> </button>
                <button id={`generate-lang-${uuid}`} class='search-button' title="Generate Language"
                    onClick={() => generateLanguage(context, props, out.metadata)}>Generate<Icon name={LinkExternal} /></button>
            </span>
        </div>
        <br />
        <div hidden={!(responseTab.exists && activeIndex === TabType.Response)}>
            <ShowOutputDiv output_file={output_file} />
            <AceWrap data={responseBody} mode={mode} active={activeIndex === TabType.Response} theme={theme} placeholder={output_file ? `check ${output_file}` : `Empty Response from Server`}></AceWrap>
        </div>
        <div hidden={!(redirectHistoryTab.exists && activeIndex === TabType.RedirectHistory)}>
            <HighLight
                code={redirectHistory}
                theme={theme}
                language={mode}>
            </HighLight>
        </div>
        {/* <AceWrap data={responseBody} mode="text" active={activeIndex === TabType.RawResponse} theme={theme}></AceWrap> */}
        <TableTab data={objectToDataGridRows(headers)} columns={["Header", "Value"]} active={headerTab.exists && activeIndex === TabType.Headers} />
        <TableTab data={testResult} columns={["Test Name", "Success", "Result"]} active={(testResultTab.exists && activeIndex === TabType.TestResult)} />
        <div class='tab-content' hidden={!(testResultTab.exists && activeIndex === TabType.TestResult)} >
            <strong><span class='key'>Script Log:</span></strong>
            <br />
            <pre>
                {scriptLog}
            </pre>
            <br />
        </div>
        <TableTab data={objectToDataGridRows(script_result?.properties)} columns={["Property", "Value"]} active={outputPropTab.exists && activeIndex === TabType.GeneratedProperties} />
        <AceWrap data={dothttpCode} mode={'http'} active={(dothttpCode ? true : false) && activeIndex === TabType.RequestSent} theme={theme}></AceWrap>
    </div>;
};

const Icon: FunctionComponent<{ name: string }> = ({ name: i }) => {
    return <span class='icon'
        dangerouslySetInnerHTML={{ __html: i }}
    />;
};


const ShowOutputDiv: FunctionComponent<{ output_file?: string }> = ({ output_file }) => {
    if (output_file)
        return <div class='request-url'>
            {output_file ? `Output stored in ` : ""} <strong>{output_file}</strong>
            <br />
            <br />
        </div>
    else {
        return <div></div>
    }

}

const TabHeader: FunctionComponent<{
    activeTab: number, setActive: (i: number) => void,
    darkMode: boolean, requestSentExists: boolean,
    headerTab: CountAndExistence,
    testResultTab: CountAndExistence,
    outputPropTab: CountAndExistence,
    responseTabMeta: CountAndExistence,
    redirectHistoryTab: CountAndExistence,
}> = ({ activeTab, setActive, headerTab: headers, requestSentExists, darkMode, testResultTab: testResult, outputPropTab: outputProps, responseTabMeta, redirectHistoryTab }) => {

    function pushIfExists(results: h.JSX.Element[], countAndExistence: CountAndExistence, tabHeading: string, activeTabNumber: TabType, title = "") {
        if (countAndExistence.exists) {
            // @ts-ignore
            results.push(<button class='tab' title={title} dark-mode={darkMode} onClick={() => setActive(activeTabNumber)} active={activeTab === activeTabNumber}>{tabHeading} <sup>{countAndExistence.count == 0 ? "" : `(${countAndExistence.count})`}</sup></button>);
        }
    };
    const renderTabHeaders = () => {
        let result: h.JSX.Element[] = [];
        pushIfExists(result, responseTabMeta, "Response", TabType.Response, "If Output is binary consider using `output('<filename>')`");
        // pushIfExists(result, { exists: true, count: 0 }, "Raw", TabType.RawResponse);
        pushIfExists(result, headers, "Headers", TabType.Headers);
        pushIfExists(result, testResult, "Test Result", TabType.TestResult);
        pushIfExists(result, outputProps, "Generated Properties", TabType.GeneratedProperties);
        pushIfExists(result, { exists: requestSentExists, count: 0 }, "Request Sent", TabType.RequestSent);
        pushIfExists(result, redirectHistoryTab, "Redirect History", TabType.RedirectHistory);

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


const AceWrap: FunctionComponent<{ data: string, active: boolean, theme: string, mode: string, placeholder?: string }> = ({ data, active, theme, mode }) => {
    if (mode == "txt") {
        return <div class='tab-content' id='data-container' hidden={!active}>
            <pre >{data}</pre>
        </div>;
    } else {
        return <div class='tab-content' id='data-container' hidden={!active}>
            <HighLight code={data}
                theme={theme}
                language={mode}></HighLight>
        </div>;
    }
};

const TableTab: FunctionComponent<{ active: boolean, data: Array<Array<string>> | undefined, columns: Array<string> }> = ({ active, data, columns }) => {
    if (data && data!.length > 0)
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


function formatBody(filenameExtension: string | undefined, body: string) {
    try {
        if (filenameExtension === "json") {
            body = jsonPretty(body, '\t');
        } else if (filenameExtension == 'xml') {
            body = xmlPretty(body, '\t');
        }
    } catch {
        console.log("content-type is not same as server response");
    }
    return body;
}

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

