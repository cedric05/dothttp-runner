# Change Log

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