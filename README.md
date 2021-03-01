# dothttp-runner README

visit dothttp (dsl for http) via [dothttp](https://github.com/cedric05/dothttp).


⚠️ for using dothttp-runner, you will need to install python3.8 and have to install `dothttp-req, flask`

flask is one of requirement for now, and will be removed in future releases.


install via

`python3 -m pip install dothttp-req==0.0.5 flask`

once installed set vscode pythonpath to `dothttp.conf.pythonpath` in vscode `settings.json`
## Features

- [x] Run http file in editor itself
- [x] load .dothttp.json into editor
- [x] set environements from editor
  - [x] copy env
  - [x] open `.dothttp.json` from env view for easy edit
- [x] set properties from editor
  - [x] copy property
- [x] change environments priority
- [ ] save history for requests
- [x] open executed file in seperate tab with content-type

<img src="./demo.gif" >

### future
current repository will be moved into this [dothttp-code](https://github.com/cedric05/dothttp-code)
## Requirements

at present you will need python3.9. 

## Extension Settings

* `dothttp.conf.pythonpath` 
* `dothttp.conf.path` 
* `dothttp.conf.experimental` 
* `dothttp.conf.nocookie`
* `dothttp.conf.history`
* `dothttp.conf.curl`

## Known Issues
- [ ] only file names without - are working

## Release Notes
