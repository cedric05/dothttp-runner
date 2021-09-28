# Change Log

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
