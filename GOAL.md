# Dothttp Runner

High level goals are
- [x] Run http file from dothttp
  - [x] show response in right pane
    - [x] set filetype (like json/html/xml) for lang support
  - [x] show debug output in debug console of vscode
- [x] parse `.dothttp.json` from http file dir and list environments (tree view)
  - [x] `*` env properties should show with name `default` and bold
  - [x] `headers` section with bold (as its applied for all)
  - [x] rest environments list
    - [x] checkbox to enable environments
  - [x] expand of any above section should show display properties
  - [x] on double click it should open file (to currect position) ??????
- [x] should be able to set properties from side left pane
- [x] remember last run environments , properties for each file.
  - [x] close and open same *httpfile*. it should set same enabled properties
- [ ] easy installable


Complete Installation/configuration plan:
  - extension will only have core functionality.
  - post installation
    - options
      1. download pyinstaller files from github
      2. mandate python3.9 and install deps in root (python) (not gonna work for all users)
    - we will pick option *[2]* initally 😤 (may pick up where we left of and go on with option *[1]*!!)

Configuration:
  - set python3.9 path 
    - dothttp.conf.pythonpath (string)
    - dothttp.conf.path (string)
    - dothttp.conf.showheaders (bool)
  - enable experimental features (conf.)
    - dothttp.conf.experimental (true/false)
  - disable cookie
    - dothttp.conf.nocookie (true/false)
  - disable history ?? (not developed in upstream, may not)
    - dothttp.conf.savehistory (true/false)

WorkFlow:
  - User opens `.http` file, wants to run.
    - it may fail / pass
  - User will make use of templating feature of **dothttp** and create few propertys
  - User can view default `.dothttp.json` property file
    - enable properties and environmets has he likes and makes 
 
UnAnswered:
  - Not all requests are jiffy. what should extension do when requests take too much time
