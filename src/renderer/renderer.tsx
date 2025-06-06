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
import { DothttpExecuteResponse, DothttpRedirectHistory, MessageType, NotebookExecutionMetadata } from '../common/response';
const { HighLight } = require('dot-preact-highlight');



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


/**
 * The maximum default format length, defined as 512 * 1024 bytes or 0.5MB.
 * This constant is used to set a limit on the size of data that can be processed
 * or formatted by default. Adjust this value if larger data sizes need to be handled.
 */
const MAX_DEFAULT_FORMAT_LEN = 1024 * 512;

type HttpResponseAndMetadata = {
    response: DothttpExecuteResponse;
    metadata: NotebookExecutionMetadata;
};

export const MultiResponse: FunctionComponent<{ multiResponse: [HttpResponseAndMetadata], context: RendererContext<any> }> = ({ multiResponse, context }) => {

    const [currentIndex, setIndex] = useState(0);

    // save indexes for opening in comparision view

    const [indexList, setIndexList] = useState([] as Array<number>);

    const selectIndex = (index: number) => {
        if (indexList.includes(index)) {
            setIndexList(indexList.filter(i => i !== index));
        } else {
            setIndexList([...indexList, index]);
            if (indexList.length === 1) {
                // open comparision view
                // instead of sending indexes, send the whole response
                context.postMessage!(
                    {
                        "responses": [
                            {
                                "body": multiResponse[indexList[0]].response.response.body,
                                "index": indexList[0] + 1
                            },
                            {
                                "body": multiResponse[index].response.response.body,
                                "index": index + 1
                            }
                        ],
                        "request": MessageType.compare,
                    });
            }
        }

    }

    const handleLeftClick = () => {
        if (currentIndex > 0) {
            setIndex(currentIndex - 1);
        }
    };

    const handleRightClick = () => {
        if (currentIndex < multiResponse.length - 1) {
            setIndex(currentIndex + 1);
        }
    };

    const handleSkip5Forward = () => {
        if (currentIndex < multiResponse.length - 5) {
            setIndex(currentIndex + 5);
        }
    };

    const handleSkip5Backward = () => {
        if (currentIndex >= 5) {
            setIndex(currentIndex - 5);
        }
    };

    const handleGoToLast = () => {
        setIndex(multiResponse.length - 1);
    };

    const getToFirst = () => {
        setIndex(0);
    };


    return (
        <div>
            <div>
                <Response
                    out={multiResponse[currentIndex]}
                    context={context}
                />
            </div>

            <div>
                <button class={currentIndex === 0 ? 'nextbutton-disabled' : 'nextbutton'} onClick={getToFirst} disabled={currentIndex === 0} title="go to first"> First </button>
                <button class={currentIndex < 5 ? 'nextbutton-disabled' : 'nextbutton'} onClick={handleSkip5Backward} disabled={currentIndex < 5} title="Go back 5">
                    &lt;&lt;
                </button>
                <button class={currentIndex === 0 ? 'nextbutton-disabled' : 'nextbutton'} onClick={handleLeftClick} disabled={currentIndex === 0} title="go back">
                    &lt;
                </button>
                <span> {currentIndex + 1} / {multiResponse.length}</span>
                <button class={currentIndex === multiResponse.length - 1 ? 'nextbutton-disabled' : 'nextbutton'} onClick={handleRightClick} disabled={currentIndex === multiResponse.length - 1} title="go further">
                    &gt;
                </button>
                <button class={currentIndex >= multiResponse.length - 5 ? 'nextbutton-disabled' : 'nextbutton'} onClick={handleSkip5Forward} disabled={currentIndex >= multiResponse.length - 5} title="skip 5">
                    &gt;&gt;
                </button>
                <button class={currentIndex === multiResponse.length - 1 ? 'nextbutton-disabled' : 'nextbutton'} onClick={handleGoToLast} disabled={currentIndex === multiResponse.length - 1} title="go to last"> Last </button>

                <button class={indexList.includes(currentIndex) ? 'nextbutton-selected' : 'nextbutton'} onClick={() => selectIndex(currentIndex)} title="compare">

                    {indexList.includes(currentIndex) ? "Selected for Comparison" : "Select"}

                </button>

            </div>
        </div>
    );
};

export const Response: FunctionComponent<{ out: Readonly<HttpResponseAndMetadata>, context: RendererContext<any> }> = ({ out: httpResponse, context }) => {
    const { response: props } = httpResponse
    // createStates
    const [activeIndex, setActive] = useState(TabType.Response);

    // create keys
    const uuid = uuidv4()
    const saveButtonId = `save-button-${uuid}`;


    // retriveResponse
    const { headers, url, status } = props.response
    const { executionTime } = httpResponse.metadata
    let { body, output_file } = props.response
    const { filenameExtension, http: dothttpCode, script_result, history } = props


    if (body.length < MAX_DEFAULT_FORMAT_LEN) {
        body = formatBody(filenameExtension, body);
    } else {
        body = `Response too large (exceeds 0.5MB) to display. Use "Open In Editor" to view the full response in a new tab.`;
    }
    let redirectHistory = history ?? []
    const [responseBody, setResponseBody] = useState(body);
    setResponseBody(body)

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
                    onClick={() => saveResponse(context, props, httpResponse.metadata)}>Open In Editor <Icon name={OpenInEditor} /> </button>
                <button id={`generate-lang-${uuid}`} class='search-button' title="Generate Language"
                    onClick={() => generateLanguage(context, props, httpResponse.metadata)}>Generate<Icon name={LinkExternal} /></button>
            </span>
        </div>
        <br />
        <div hidden={!(responseTab.exists && activeIndex === TabType.Response)}>
            <AceWrapConditional data={responseBody} mode={mode} active={activeIndex === TabType.Response} theme={theme} output_file={output_file}></AceWrapConditional>
        </div>
        <div hidden={!(redirectHistoryTab.exists && activeIndex === TabType.RedirectHistory)}>
            <RequestHistory redirectHistory={redirectHistory}></RequestHistory>
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
const Status: FunctionComponent<{ code: number, method?: String, url: string, executionTime?: string, phrase?: boolean }> = ({ code, url, method, executionTime, phrase }) => {
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
    var detailed_phrase = "";
    if (phrase) {
        if (code == 0) {
            detailed_phrase = "REQUEST_PARSE_ERROR";
        } else {
            detailed_phrase = getReasonPhrase(code).toLowerCase();
        }
    }


    return <div class="status-and-url">
        <span className={`status-label status-label-${statusType!}`} >{code} {detailed_phrase}</span>
        {method ? <span >{method}</span> : <span></span>}
        {executionTime ? <span class='execution-summary' >{executionTime}s</span> : <span></span>}
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


const HistoryItem: FunctionComponent<{ history: DothttpRedirectHistory }> = ({ history }) => {
    const [expand, setExpand] = useState(true);
    return (<div>
        <div class='history-item'>
            <button className='history-toggle' onClick={() => { setExpand(!expand) }}>
                {expand ? <div>^</div> : <div>˅</div>}
            </button>
            <span> <Status code={history.status} method={history.method} url={history.url} phrase={true}></Status></span>
        </div>
        {expand ? <div></div> : <div>
            <table>
                <tr>
                    <th class="key column"><b>Header</b></th>
                    <th class="key column"><b>Value</b></th>
                </tr>
                {
                    Object.entries(history.headers)
                        .map(
                            ([key, value]) => (<tr>
                                <td class='key column'>{key}</td>
                                <td class='key column'>{value}</td>
                            </tr>)
                        )
                }
            </table>
        </div>}
    </div>);
}

const RequestHistory: FunctionComponent<{ redirectHistory: DothttpRedirectHistory[] }> = ({ redirectHistory, }) => {
    // createStates

    return (<div>
        <div>
            {
                redirectHistory
                    .map(
                        history => <HistoryItem history={history}></HistoryItem>
                    )
            }
        </div>
    </div>);
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

interface AceWrapConditionalProps {
    output_file?: string;
    data: any;
    mode: any;
    active: boolean;
    theme: any;
}

const AceWrapConditional: FunctionComponent<AceWrapConditionalProps> = ({ output_file, data, mode, active, theme }) => {
    if (!output_file) {
        return (
            <AceWrap
                data={data}
                mode={mode}
                active={active}
                theme={theme}
                placeholder={output_file ? `check ${output_file}` : `Empty Response from Server`}
            />
        )
    }
    else {
        return <div class='request-url'>
            {output_file ? `Output stored in ` : ""} <strong>{output_file}</strong>
            <br />
            <br />
        </div>
    }
}
