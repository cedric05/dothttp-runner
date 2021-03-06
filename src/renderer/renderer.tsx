/* eslint-disable @typescript-eslint/naming-convention */
import { FunctionComponent, h } from 'preact';
import { StateUpdater, useEffect, useState } from 'preact/hooks';
import { v4 as uuidv4 } from 'uuid';
import { DothttpExecuteResponse } from '../common/response';
var stringify = require('json-stringify-safe');
// import * as Search from 'vscode-codicons/src/icons/search.svg';

export const Response: FunctionComponent<{ response: Readonly<DothttpExecuteResponse> }> = ({ response }) => {
    const [activeIndex, setActive] = useState(0);
    const [searchKeyword, setSearchKeyword] = useState('');
    const uuid = uuidv4();
    const searchBarId = `search-bar-${uuid}`;
    const searchButtonId = `search-button-${uuid}`;

    let darkMode = document.body.getAttribute('data-vscode-theme-kind')?.includes('dark') ?? false;

    useEffect(() => {
        document.getElementById(searchBarId)?.addEventListener('keypress', event => {
            if (event.key === 'Enter') {
                document.getElementById(searchButtonId)?.click();
            }
        });
    });

    var headersExists = false;
    if (response.response.headers && Object.keys(response.response.headers).length != 0) {
        headersExists = true;
    }

    // this is hack.
    // sender should set it.
    if (response.response.contentType === "application/json") {
        response.response.body = JSON.stringify(JSON.parse(response.response.body), null, 1)
    }

    const testResult: { [key: string]: any } = {}
    response.script_result?.tests?.forEach(key => {
        testResult[key.name] = { success: key.success ? "true" : "false", result: key.result || key.error }
    });


    const scriptResultExists = (response.script_result && response.script_result.tests.length > 0) ? true : false;
    const propertiesGenerated = response.script_result && response.script_result.properties && Object.keys(response.script_result.properties).length > 0 ? true : false;
    if (response.script_result) {
        if (response.script_result.stdout === "") {
            response.script_result.stdout = "no log";
        }
    }
    return <div>
        <Status code={response.status} url={response.url} />
        <br />
        <div class='tab-bar'>
            <TabHeader activeTab={activeIndex} setActive={setActive}
                headersExist={headersExists}
                requestExists={response.http ? true : false}
                darkMode={darkMode}
                scriptResultExists={scriptResultExists}
                generatedProperties={propertiesGenerated} />
            <span class='tab-bar-tools'>
                <input id={searchBarId} placeholder='Search for keyword'></input>
                <button id={searchButtonId} class='search-button' title='Search for keyword' onClick={() => handleSearchForKeywordClick(setSearchKeyword, searchBarId)}>
                    {/* <Icon name={Search} /> */}
                </button>
            </span>
        </div>
        <br />
        <DataTab data={response.response.body} active={activeIndex === 0} searchKeyword={searchKeyword} />
        <TableTab dict={response.response.headers} active={activeIndex === 1} searchKeyword={searchKeyword} />
        <DataTab data={response.http} active={activeIndex === 3} searchKeyword={searchKeyword} />
        <div>
            <TableTab dict={testResult} active={activeIndex === 4} searchKeyword={searchKeyword} />
            <div class='tab-content' hidden={!(activeIndex === 4)}>
                <strong><span class='key'>Script Log</span></strong>
                <DataTab data={response.script_result.stdout ?? "no log"} active={activeIndex === 4} searchKeyword={searchKeyword} />
            </div>
        </div>
        <TableTab dict={response.script_result.properties} active={activeIndex === 5} searchKeyword={searchKeyword} />
    </div>;
};

const TabHeader: FunctionComponent<{
    activeTab: number, setActive: (i: number) => void,
    headersExist: boolean, requestExists: boolean,
    darkMode: boolean,
    scriptResultExists: boolean,
    generatedProperties: boolean
}> = ({ activeTab, setActive, headersExist, requestExists, darkMode, scriptResultExists, generatedProperties }) => {
    const renderTabHeaders = () => {
        let result: h.JSX.Element[] = [];

        //@ts-ignore
        result.push(<button class='tab' dark-mode={darkMode} onClick={() => setActive(0)} active={activeTab === 0}>Data</button>);

        if (headersExist) {
            //@ts-ignore
            result.push(<button class='tab' dark-mode={darkMode} onClick={() => setActive(1)} active={activeTab === 1}>Headers</button>);
        }

        if (requestExists) {
            //@ts-ignore
            result.push(<button class='tab' dark-mode={darkMode} onClick={() => setActive(3)} active={activeTab === 3}>Request Sent</button>);
        }

        if (scriptResultExists) {
            //@ts-ignore
            result.push(<button class='tab' dark-mode={darkMode} onClick={() => setActive(4)} active={activeTab === 4}>Test Result</button>);
        }

        if (generatedProperties) {
            //@ts-ignore
            result.push(<button class='tab' dark-mode={darkMode} onClick={() => setActive(5)} active={activeTab === 5}>Generated Properties</button>);
        }

        return result;
    };

    return <span>
        {renderTabHeaders()}
    </span>;
};

// reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
const Status: FunctionComponent<{ code: number, url: string }> = ({ code, url }) => {
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

    const generateCodeLabel = () => {
        //@ts-ignore
        return <span class='status-label' statusType={statusType}>{code}</span>;
    };

    return <div>
        {generateCodeLabel()}   <span class='request-url'>   {url}</span>
    </div>;
};

const TableTab: FunctionComponent<{ dict?: any, active: boolean, searchKeyword: string }> = ({ dict, active, searchKeyword }) => {
    const renderFields = () => {
        return Object.keys(dict).map((key) => {
            if (dict[key] === null) {
                return <tr>
                    <td class='key column'>{key}</td>
                    <td>null</td>
                </tr>
            }
            if (typeof dict[key] === 'object') {
                return <tr>
                    <td class='key column'>{key}</td>
                    <td>
                        <ul class='sub-list'>
                            {Object.keys(dict[key]).map((subKey) => {
                                let value;
                                if (typeof dict[key][subKey] === 'object') {
                                    value = stringify(dict[key][subKey]);
                                } else {
                                    value = dict[key][subKey];
                                }
                                return <li><span class='key'>{subKey}:</span>  {searchForTermInText((value as string), searchKeyword)}</li>;
                            })}
                        </ul>
                    </td>
                </tr>;
            }
            return <tr><td class='key column'>{key}</td> <td>{searchForTermInText((dict[key] as string), searchKeyword)}</td></tr>;
        });
    };

    //@ts-ignore
    return <div class='tab-content' hidden={!active}>
        <table>
            {renderFields()}
        </table>
    </div>;
};

const DataTab: FunctionComponent<{ data: any, active: boolean, searchKeyword: string }> = ({ data, active, searchKeyword }) => {
    const dataStr = typeof data === 'string' ? data : stringify(data);

    return <div class='tab-content' id='data-container' hidden={!active}>
        <pre>
            {searchForTermInText(dataStr, searchKeyword)}
        </pre>
    </div>;
};

const Icon: FunctionComponent<{ name: string }> = ({ name: i }) => {
    return <span class='icon'
        dangerouslySetInnerHTML={{ __html: i }}
    />;
};


const handleSearchForKeywordClick = (setter: StateUpdater<string>, searchBarId: string) => {
    const keyword = (document.getElementById(searchBarId) as HTMLInputElement)?.value ?? '';
    setter(keyword);
};

const searchForTermInText = (text: string, searchKeyword: string) => {
    let splitOnSearch = [text];
    if (searchKeyword !== '' && typeof text === 'string' && text) {
        splitOnSearch = text.split(searchKeyword);
    }

    return <span>
        {splitOnSearch.map((token, i) => {
            if (i === splitOnSearch.length - 1) {
                return <span>{token}</span>;
            } else {
                return <span>{token}<span dangerouslySetInnerHTML={{ __html: `<span class='search-term'>${searchKeyword}</span>` }} /></span>;
            }
        })}
    </span>;
};