# Change Log

## Known issues
- notebook search with `m` or `y` in key won't work, as vscode configured default shortcut `m` to change cell to markdown and is annoying. [remove](https://code.visualstudio.com/docs/getstarted/keybindings#_keyboard-shortcuts-editor) `m` and `y` shortcuts for clean experience.

## 1.0.61
- Create Property from notebook/text without leaving editor
- Export properites to env file for quick edit.


## 1.0.60
- Update dependencies
- Updated dotextensions-build to version 0.0.44a23
  - Bump requests to 2.32.4

## 1.0.59
- Added support for importing properties from environment for quick conversion
- Updated dotextensions-build to version 0.0.44a22
  - Variable properties are now overridden with current cell taking precedence over other cells

## 1.0.58
- Updated generated property descriptions to indicate when they were created for better visibility.
- New property creation now pre-fills the clipboard for easier selection.


## 1.0.57
- Updated dotextensions-build to version 0.0.44a21.
  - Updates some dependent packages
- Supports running same cell multiple times.


## 1.0.56
- Updated dotextensions-build to version 0.0.44a20.
  - Supports template strings in json/variable json (previously its not possible)
- considers content-type application/x-amz-json-1.0 application/vnd3.github.json  as json response.


## 1.0.55
- Migration to new property format not working properly fixed

## 1.0.54
- Updated dotextensions-build to version 0.0.44a19.
- support migration to new format (properties)
- fix running dothttp file(not notebook) in remote 
- Ask for workspace or new window. (use workspace for ease)
- Update lodash/openapi-to-postmanv2/curl-to-postmanv2

## 1.0.53
- Updated dotextensions-build to version 0.0.44a18.
- Property view now prevents duplicate keys and allows you to select the one you want.
- Automatically retries if the CLI exits unexpectedly.
- Added support for using CLI capabilities from a remote machine (not recommended for full-fledged editing).


## 1.0.52
- Update `dotextensions-build` to version 0.0.44a15
  - Now Supports array indexing in variable
  - Now supports simple string, int, float,boolean as json 
  - Now supports redefining variable
- Update vscode-uri, ts-loader,semver


## 1.0.51
- Update `dotextensions-build` to version 0.0.44a14
- Update mocha, openapi-to-postmanv2, whatwg-url


## 1.0.49 / 1.0.48 / 1.0.50:
- Include property information for query and headers
- Fix Packaging

## 1.0.47:
- Fix issue with dothttp-code version 1.0.45, notebook execute is not working properly


## 1.0.46:
- The VSCode publish step failure was resolved by addressing a rename in the `vscode/vsce` package.


## 1.0.45:
- Create menu in explorer easy http file and notebook file
- Update `dotextensions-build` to version 0.0.44a11
  - error will fail at the end of resolution of all properties


## 1.0.44:
- Update `dotextensions-build` to version 0.0.44a10
- Enhance content resolution by including resolved property

## 1.0.43
- Update `dotextensions-build` to version 0.0.44.a9
  - **Feat** Fixes loading properties from property file on hover over url/json dict


## 1.0.42
- Update `dotextensions-build` to version 0.0.44.a9
  - **Feat** Fixes relative import issue for resolving on hover

## 1.0.41
- Update `dotextensions-build` to version 0.0.44.a7
  - **Feat** Resolves variable/url/json/data/urlencoded on hover


## 1.0.40
- Update `dotextensions-build` to version 0.0.44.a2
  - **Feat** Support variable substitution for math expressions and json

## 1.0.39
- Update `dotextensions-build` to version 0.0.44.a2
  - **New** variable with hover and syntax grammer support


## 1.0.38
- **Chore** update webpack-cli, util versions
- Update `dotextensions-build` to version 0.0.44.a1
  - **Feat** Supports Variable syntax instead of doing it comments



## 1.0.37
- **Fix** disable env not working properly fixed

## 1.0.36
- A single environment state is applied to the entire workspace folder.  
- A single property state is applied to the entire workspace folder.  
- Use an icon to distinguish between enabled and disabled states.  


## 1.0.35
- Update `dotextensions-build` to version 0.0.43
  - **Feat:** variable can be created from other variable via template feature `f'{var1} {var2}'`
  - **chore:** Updates jinja2 version
- Update `npm` packages
  - shell-quote


## 1.0.34
- Update `dotextensions-build` to version 0.0.43-a29
  - **Feat:** Notebook request dothttp exception is now shown in the DothttpUI view instead of simple text.
  - **Fix:** The error message for default/infile variable multi substitution not being supported has been improved to better explain what went wrong.
- Update `npm` packages


## 1.0.33
- Update `dotextensions-build` to version 0.0.43-a28
  - Support math expressions in variable syntax using keyword `$expr`. For example `$expr:2*10` will substitute `20`
  - can use `xmltodict` library for testing/parsing xml response in test_scripts


## 1.0.32
- **Fix #250:** Resolved issue with `aws_auth` hover functionality.  
- **Fix #242:** Corrected grammar in Python scripting documentation.  
- **Update `dotextensions-build` to version 0.0.43-a27:**  
  - Added suggestions for URLs that are behind HTTPS with self-signed certificates.

## 1.0.31
- Fix header completions appearing in all areas causing bad experience (like payload and test script)
- Fix Url completion not working properly with notebook
- Update grammer, json payload doesnot need to have quotes for strings.

## 1.0.30
- package.json version issue fixed.


## 1.0.29
- Dothttp Diagnostics is now configurable
-  Update dotextensions-build to 0.0.43-a26
  * json payload: keys/values without quotes & prerequest message cleanup & use pytest to test dothtp request files 


## 1.0.28
- Fixes #218 , History is lost if one runs into error


## 1.0.27
- Update dotextensions-build to 0.0.43-a24
  * Bump python from 3.11 to 3.13 by @dependabot in https://github.com/cedric05/dothttp/pull/310
  * Fix https://github.com/cedric05/dothttp/issues/321 Support aws auth session_token by @cedric05 in https://github.com/cedric05/dothttp/pull/322
  * Fix https://github.com/cedric05/dothttp/issues/319 support running system commands via shell and capturing it as property
  * Fix https://github.com/cedric05/dothttp/issues/318: support reading env variables and respective test case
  * Fix https://github.com/cedric05/dothttp/issues/301: Add support for using jsonschema in test scripts
  * Fix https://github.com/cedric05/dothttp/issues/320: add support to use requests package in prerequest script
    * **Full Changelog**: https://github.com/cedric05/dothttp/compare/v0.0.43a23...v0.0.43a24
- Removed eslint dependencies

## 1.0.26
- Fix build issues

## 1.0.25
- Update dotextensions-build to 0.0.43-a23
  - Allows user to use arthematic expressions in json payload
- Fix linux arm64 extension: packages correct platform version of dotextensions-build
- Update dependent packages
  - yauzl to 3.1.3
  - jsonc-parser to 3.3.1

## 1.0.24-1.0.23
- Keep history of cell response for comparision.
  - max number of responses to keep in notebook can be configured by `dothttp.conf.notebook.numofresponses`. 
    - if `0`, it keeps all, default is five.
  - Update dependent packages
    - follow-redirects to 1.15.8
    - @types/node to 22.5.2
    - @types/lodash to 4.17.7


## 1.0.22
  - Update dotextensions-build/cli to 0.0.43a16
    - Updates dependent packages (requests, msal, faker, certifi, urllib3)

## 1.0.21
  - Update dotextensions-build/cli to 0.0.43a14
    - Updates dependent packages

## 1.0.20
  - Update dotextensions-build/cli to 0.0.43a13
    - Fix Azure Cli Login

## 1.0.19
  - Update dotextensions-build/cli to 0.0.43a11
    - Removes javascript as default script
    - Updates python version to 3.11.8
    - updates few dependent packages
  - Fixes extension in codespace, not working

## 1.0.18
  - Update dotextensions-build/cli to 0.0.43a10
    - Fixes dothttp not working
  - chore: update renderer to not show output in output shell if output_file exists

## 1.0.17
- Chore: update doc links for azure auth cli.


## 1.0.16
- Update dotextensions-build/cli to 0.0.43a7
  - Fixes error message for azure auth requeests in case of failure to acquire token.


## 1.0.15
- Update dotextensions-build/cli to 0.0.43a6
  - chore bump versions for `faker`, `waitress`, `requests-pkcs12`
- Adds init script execution which runes before loading data (usefull for loading variables)
- Update prerequest support to payload variables
- Can use `json`, `yaml`in prerequest phase


## 1.0.14
- Update dotextensions-build/cli to 0.0.43a5
  - `urllib`, `cryptography`, `open` all now allowed in prerequest script

## 1.0.13
- Update dothextensions-build/cli to 0.0.43a4
  - chore update python packages (jinja2, faker, crytpography, jsonschema, textx, flask)
  - Fix Azure cli auth for windows


## 1.0.11 & 1.0.12
- Update dothextensions-build/cli to 0.0.43a2
  - New : Adds support to azureauth
  - Updates dependent packages
    * Bump faker from 19.13.0 to 20.0.0 by @dependabot in https://github.com/cedric05/dothttp/pull/202
    * Azure Auth Support by @cedric05 in https://github.com/cedric05/dothttp/pull/209
    * chore bump `jsonschema` to 4.20.0
    * chore bump `textx` to 4.0.1
    * chore bump `restrictedpython` to 7.0
    * chore bump `faker` to 20.1.0
    * add new python package `msal` to 1.26.0
    * Add azure auth support 
    * update badssl certificates 

## 1.0.10
- Update dothextensions-build/cli to 0.0.43a1
    - Improvement: now `json` keyword is optional when payload content-type is `application/json` 
    - Improvement:  Empty file is valid http file, no need to create empty http request just to avoid compilation issue
    - Improvement: Provide support to suggest extendable http requests.
- Improvement: add suggestions for extendable http requests.
- Fix: issues with click provider 

## [1.0.9]
- Update dothextensions-build/cli to 0.0.42
  - fix: property from multiple cells or imports is getting overridden resulting into undefined property


## [1.0.8]
- Update dothextensions-build/cli to 0.0.42a13
  - Add support to http proxies
  - Fix import loads from different cells

## [1.0.7]
- Update dothextensions-build/cli to 0.0.42a12
- Fix peer dependencies issue (uses dot-preact-highlight inplace of preact-highlight)
- go to import file.

## [1.0.6]
- Update dotextensions-buil/cli to 0.0.42a11
  - adds support for import requests from other files
  - adds support for recursive parents
- Ignore errors in case of rouge stdout from terminal
- Fix Renderer issues 
  - #148 Unable to open editor from sister extension dotbook
  - #147 unable to generate from sister extension dotbook


## [1.0.5]
- won't try to update/upgrade cli incase of cli builtin into the extension.

## [1.0.4]
- [ **Improvement**] Platform specific in case dothttp-runner as few systems are behind firewall and won't be able to download dotextensions-build

## [1.0.3]
- [ **Fix**] Notebook renderer is not updating with latest response when output cell is run multiple times, fixed

## [1.0.2]
- [ **Improvement**] Fix null property file while executing request without property file


## [1.0.1]
- [ **Improvement**] Properties are now at workspace level
- [ **Improvement**] Env are now at workspace level
- [ **Improvement**] configure custom env file instead of default .dothttp.json


## [0.0.63]
- [ **Improvement**] History export with filename seperation


## [0.0.62]
- [ **BUG**] History tree item is not showing all, if there is an error in one item
- [ **Improvement**] History export now excludes cells with no status code

## [0.0.61]
- [ **New**] Now notebook cells can be cleared from scm window


## [0.0.60]
- [ **Improvement**] expand url now correctly handles in case double quote is urlencoded.

## [0.0.59]
- [ **Bump**]
  - Bump async and openapi-to-postmanv2
  - Bump terser from 5.14.1 to 5.14.2

## [0.0.58]
- [ **BUG**] fix Property view is not showing for `.http/.dhttp` files
- [ **Feature**] Support hiding property value by default
  - toggle/untoggle for to view/hide

## [0.0.57]
- [ **BUG**] Text response is not being show in notebooks

## [0.0.56]
- [ **BUG**] Fix properties not working in notebook
- [ **BUG**] error is not showing up

## [0.0.55]
- [ **New**] Added Support for linux arm
- [ **Improvement**] History export with date wise categorization
- [ **Improvement**] Openapi3 import to dothttp is fully supported now.


## [0.0.54]
- [ **Improvement**] Suggests reloading when dothttp path or agent path is updated
- [ **Improvement**] Has Support to export all the history (executed http requests) to a notebook to easy share across peers


## [0.0.52/0.0.53]
0.0.52 is a prerelease of 0.0.53
- [ **Bug**] Generate/OpeninEditor is not working in notebook output (bug introduced in webextension support (0.0.49))
**prerelease**
- [ **Improvement**] Fix script execution logging is not logging error output if compilation issue
- [ **Improvement**] change from ace editor to highlighter.js for faster rendereing. if you want to keep using ace editor, install dotbook extension

## [0.0.51]
- [ **Bug** ] Fix installation issues (dothttp command line)

## [0.0.50]
- [ **Improvement**] Support for html in notebook cell output
- [ **Improvement**] output channel is now renamed from `dothttp-code` to `Dothttp`
- [ **Bug**] Fix export to postman from notebook
- [ **Bug**] history is not working after 0.0.49

## [0.0.49]
- [ **Fetaure**] suggestions of test scripts
- [ **Improvement**] removes annoying setting of dothttp path in `.settings.json`
- [ **Bug**] Fix for http as httpbook is not assigning correct file extension


## [0.0.48] (insiders)
- [ **Bug**] fix(httpnotebook): open as http file fixed
- [ **Bug**] fix: save output as file has filename ending with (0)

## [0.0.47] (insiders)
- [ **Bug**] fix(generation): code generation fails when language is nodejs
- [ **Bug**] fix: variables not working fixed
## [0.0.46] (insiders)
- [ **Feature**] web extension has notebook support

## [0.0.46]
- [ **Feature** ] support webextension
- [ **Bug** ] Fix code generation for node js not working.


## [0.0.45]
- [ **BUG** ] Generate lang is not working incase of reference to other cells

## [0.0.44]
- [ **BUG** ] fixed extension not working (caused by 0.0.43)
## [0.0.43]
- [ **Improvements** ] activates everytime.
  - helps if developer wants to import/export without having no http notebooks/files.
- [ **BUG** ] [Windows] import postman/har as notebook shows error warning
- [ **BUG** ] [Windows] Fix for Using extension opens cmd
- [ **BUG** ] Fix for extension not working when installed first time.

Checkout dothttp notebook [collections](https://github.com/cedric05/api-collections)

## [0.0.42]
- [**Improvement**] NTLM auth suggestions and other
- [**Improvements**] Notebook
  - Generate curl/code from cell itself
  - Now output of cell creates new presentation view for most used content types (simple view)
  - Actions to Reveal history/Variables view && Restart cli with ease
- [**Bug**] web extension show commands only which works
- [**Bug**] Earlier history is always recorded. now it respsects configuration

## [0.0.41]
- [**Improvement**] New Walkthroughs to setup dothttp easily
- [**Improvement**] NewNotebook/NewHttpFile Menu

## [0.0.40]
- [**Improvement**] Use Vscode inbuilt search in notebook

## [0.0.39]
- [**bump**] swagger-to-har2 to 1.0.5
  - tested with https://github.com/APIs-guru/openapi-directory

## [0.0.38]
- [**Improvement**] better code outline and easy filtering
  - use '^' to filter urls
  - use '#' to filter by name
- [**Improvement**] test script completion provided using request forwarding to javascript.
- [**bump**] dothttp version to 0.0.40a2
  - supports script suggestions
- [**bump**] swagger-to-har2 to 1.0.4
  - fixes openapi3 import request payloads
- [**Bug**] swagger import is not showing '.yml' files while import
- [**Bug**] renaming target in notebook or reording notebook is causing failure with `incorrect target`  fixed




## [0.0.37]

- [**New**] added `create new notebook command`
- [**New**] support web extensions (vscode.dev/github.dev)
  - Only syntax highlighting and notebook viewing is supported for any other features.
- [**Bug**] update settings gui section name (earlier it used to be `configuration` now it will be `new`)
- [**Bump**] bump dothttp version to 0.0.40-alpha1
  - changes w.r.t new improvments like syntax structure.
## [0.0.36]

- [**Bug**] fix view of dothttp notebook view of unknown mimetype
- change download dothttp notification from lower to progress
## [0.0.35]
- [**Bug**] fix activation of extension on first time

## [0.0.34]

- [**New**] show information message when ever http file is opened. to switch to httpbook
- [**Improvement**] ask for file type, (http or notebook) when importing resource (swagger, har, postman, curl, curlv2)
- [**Bug**] Fix uploading httpbook `export as postman` for a file fix
- [**Bug**] Fix for showing response if server says content-type to `json` and json content is not sent
- [**Feature**] show output if output is mentioned in request. (used occationally when response is binary)


## [0.0.33]

- [**Improvement**] **HttpBook**
  -  formatting for json and xml (on user input)
  -  Hover, active, inactive coloring fix
  -  Indicate number of headers, number tests, properties, show script output log if exists
- [**Improvement**] upload httpbooks to postman collection/account
- [**Bug**] Fix for Notebook target execution for first time is not working

## [0.0.32]

- [**Feature**] Postman Personal Account Integration
  - [**Feature**] Import Postman Collections / workspaces
  - [**Feature**] Export to Postman Collection (single file and folder)
- [**Feature**] Better suggessions for generate programming language
- [**Feature**] Httpbook response coloring using ace editor and search from output
- [**Bug**] **HttpBook** Generate request programming language is not working in case of target not defined in same cell
- [**Bug**] Request error is not shown in case of property is not found
- [**Bug**] history item not executing fixed
- [**BUMP**] dothttp build to 0.0.40


## [0.0.31]

- [**Improvement**] **HttpBook**
  - Save Response of **httpbook** cell
  - Generate Programming Language (easy import) from **HttpBook** cell
  - Convert **HttpBook** to httpfile for easy sharing
  - Show Hover suggesstions in **HttpBook** cell
  - Run Individual target when multiple targets are defined in single cell of **HttpBook** notebook
  - Http Targets can be extended from http target defined in Other cell of **HttpBook** notebook
  - Import http file as **Httpbook** (notebook)
- [**Improvement**] feat(useunstable): use unstable build of dothttp, includes unstable build of dothttp while figuring out which version to download
- [**Improvement**] now, extension uses disposes all commands, which helps vscode editor refresh or discard extension when not in use faster
- [**Bug**] Targets Execution will be taken from code lens or editor panel (earlier, it is taken from activetexteditor, which is running into errors incase its not real editor, such as output window)
- [**Bug**] export to postman runs into error in case of file already exported.
- [**Bug**] import postman runs into error in case of file already exits, now shows correct error message.




## [0.0.30]

- [**Improvement**] Import Resource Message Fix for all import types
- [**Improvement**] dothttp-cli Install only stable versions

## [0.0.29]

- [**Improvement**] Better support for swagger import

## [0.0.28]

- [**Improvement**] export postman now generates filename with suffix ".postmancollection.json"
- [**New Feature**] supports importing har file
- [**Improvement**] curl with new library and import by file, should fix most curl import issues
  - Use other formats as curl import os not standardised
- [**Improvement**] Now `dothttp history`, `dothttp environment` and `dothttp propertiles` will be shown in seperate view container for easy access

## [0.0.27]
This is a minor update
- [**Improvement**] Editor commands now more approachable (now available in editor context)
- [**Improvement**] Generate request programming language is including "gen..py" fix


## [0.0.26]

- [**Improvement**] dothttp completions
- [**Upgrade**](https://github.com/cedric05/dothttp/releases/tag/v0.0.31) Bump dothttp version to 0.0.31
  - [**Feature**] support unix domain docket
  - [**Bug**](https://github.com/cedric05/dothttp/pull/107) export to postman fails
  - [**BUG**] Intuitive url extend from base
  - [**BUG**] Fix for export to postman, http file with json payload is not including content-type header to `application/json`
  - [**BUG**] Fix for export to postman, http exporting collection with url having ports failing with error
  - [**BUG**] Fix for Basic auth not getting generated for http2har
  - [**Bug**] Fix curl url query params not getting generated
  - [**BUG**] Fix generate curl not including query
  - [**Improvement**] basicauth header is not getting generated for httptohar(used for generate programming languages for all requests)
- [**Bug**](https://github.com/cedric05/dothttp-runner/pull/83/commits/e3b7b7eb146cdc6885e4cf3780c6b346d0dbbc77) Fix remote containers path is getting updated while switching from container to local


## [0.0.25]

- [**Feature**] Better distinction between json and javascript
- [**Feature**] editor will show suggestions in `.dothttp.json`
- Bump dothttp version to 0.0.26
  - [**Feature**] New dynamic properties ($randomSlug, $uuid, $timestamp)
  - [**Improvement**] Better postman export (apikey, bearerauth)
  - [**Improvement**] Curl/har export shows duplicate headers in case of header has case change
  - [**Improvement**] Curl Generation/export will add content-length (curl itself will generate, adding it will cause other problems)
  - [**Continous**] keeping track of performance
  - [**Improvement**] load huge request payload from file without fear memory
  - [**Bug**] Curl/har with basic auth, adding authentication header fixed
  - [**Bug**] postman with urlencode not working fixed

## [0.0.23] & [0.0.24]
- [**Feature**] Import Single Curl Request
- [**Feature**] Import Swagger (2.0 & 3.0, versions more than 3.0 might work not guaranteed )
- [**Feature**] Export http file to postman collection for easy sharing with peers
- [**Improvement**] Bump dothttp-cli to 0.0.25

## [0.0.22]
- [**Feature**] Restart dothttp-cli command
- [**Improvement**] save file before running (for http file, for notebook it will not try to save)
- [**Bug**] import postman shows error message in case of failure
- [**Feature**] supports vscode hovers(shows informational message on hovering in dothttp)
- [**Feature**] supports vscode definition(on clicking name, it will direct you to base definition)
- [**Improvement**] postman import with file(earlier it used to be link, now supports import via locally downloaded file)
- [**Improvement**] Bump dothttp-cli to 0.0.24
  - [**Improvement**] import postman now supports 2.1.0 postman collection (also lot of bug fixes with import)

## [0.0.21]
- [**Improvement**] Bump dothttp-cli to 0.0.23
  - [**Feature**] certificates pinning for sites
    - P12 (with password)
    - cert (with cert & optional key)
  - [**Feature**] Allow insecure requests
  - [**Feature**] Cleanup Session after request completion
  - [**Improvement**] Extend url from base (base_http url + target_def url)
  - [**Improvement**] Extend certificate, insecure, clear from base
- [**Improvement**] expand url query to dothttp format


## [0.0.20]
- [**Feature**] release notebook changes
- Sync Pull latest changes for notebook
## [0.0.19]
- [**Feature**] provides ability create and test via programming languages in javascript
- [**Feature**] property updates
- [**improvement**] text/xml payload can be broken down, one can insert useful comments (comment/uncomment few parts)
- [**Bug**]fixes issue with curl import (few)

## [0.0.18]
- [**Bug**] REGRESSSION fixed dotextensions client not getting updated

## [0.0.17]
- [**Improvement**] auto installation of dothttp-req, incase of using with pythonpath
- [**Bug**] integers are sent as float in json type fixed
- [**Bug**] pure data payload with chineese not working fixed
- [**Bug**] extension package file has included unwanted files(js libraries), which increased size from 2.5 MB to 4.5 MB fixed

## [0.0.16]
- [**Improvement**] curl generated for json data types will formatted for better viewing experience
- [**Improvement**] notebooks will be serialized in formatted json, for better reading in git
- [**Improvement**] Better completion for infile variables, completes language keywords, better details for environment/properties/infile variable information
- [**Improvement**] urls can be completed from past runs(past 100 entries) (earlier it used to be from current file)
- [**Improvement**] History entry will now have urls for easy filtering
- [**Bug**] fast error reporting. (earlier there is bug which will not update error diagnostics right away, even though its fixed)
- [**Bug**] users running with pythonpath not able to start extension for first time fixed
- [**Bug**] grammer fixed and many improvements (highlights triple quotes correctly, indentation not happening fix)


## [0.0.15]
- [**Preview Feature**](https://github.com/cedric05/dothttp-runner/pull/60) dothttp notebook (like ipython notebook)


## [0.0.13/0.0.14]
- [**Feature**] Better auto completions for headers, urls, variables && macos installation fix


## [0.0.12]
- [**Feature**] suggestions anywhere in the text editor


## [0.0.11]
- [**Feature**](https://github.com/cedric05/dothttp-runner/issues/47) multiline easy escape feature


## [0.0.10]
- [**Featture**](https://github.com/cedric05/dothttp-runner/issues/41) generates/exports httpdef to few languages
- [**Bug**](https://github.com/cedric05/dothttp-runner/issues/43) resuse tab enabled, and request saved, its showing responses
- [**Bug**](https://github.com/cedric05/dothttp-runner/issues/43) http def coe generation fails when active text editor is output channel


## [0.0.9]
- [Announcement] dothttp-runner can be run in remote wsl and containers.
- [**Improvement**] history item label will be bold and will now start showing time it executed for better difference
- [**Improvement**] execute quick pick item, will not start showing urls also.
- [**Improvement**] Configure response directory name.
- [**Bug**] don't set default python3 path (if user adds it, he has to install dothttp-req)
- [**Bug**] postman import is creating duplicate folder, use showOpenDialog rather than, showSaveDialog
- [**Bug**] history execute is not showing file extension/ file syntax
- [**Bug**] history item hove is showing `200 undefined` fixed.

## [0.0.8]
- [New] reuse old tab, when executing httpdef target
- [New] format any dictionary/json in httpdef (select dictionary, do `ctrl+1` click format json)
- [New] execute entries from history
- [Improvement] now onwards windows users neednot have to change eol to linux file ending
- [Bug] all toggle commands aren't working fixed
- [New] url and method in outline

## [0.0.7]
- [New] now users can use `{{$randomStr}}, {{$randomStr:10}}, {{$randomInt}}, {{$randomInt:10}}, {{$randomBool}}, {{$randomFloat}}` to generate random strings in payload (from dothttp-req)
  - you can reuse random string via define here `{{username=$randomStr:10}}` and reuse like this `{{username}}`
- [Improvement] run and curl generation initally runs first target in http file.
    >when user runs/trys two generate two options
    >if dothttp.conf.runrecent  to true (defaults to true)
     - runs most recently run target (optional)
    >if dothttp.conf.runrecent  to false
      - asks user for which target to run
- [Improvement] while updating properties, input box will prefills old value
- [Improvement] added option to disable all environments at a time.
- [Bug] History pane is loading too much data while page load fixed.
- [Bug] curl generation in editor title is not working fixed
- [Bug] linux installation has few glitches


## [0.0.6]

- history
  - list requests made
  - view request by request (entire definition)
- no need to install dothttp-req
  - for windows and linux
- output channel
- better grammer support
  - highlights url
  - highlights name
- error reporting
    > show errors for syntax error
- http file outline
    > users can switch to different requests via `ctrl o`
- bug fixes
  - normalize name
  - [#20](issue with windows saving response)

## [0.0.4]

- add property, update property, enable disable property for http file
- support python3
