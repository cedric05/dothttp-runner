# Dothttp Runner

High level goals are
- [ ] Run http file from dothttp
  - [ ] show response in right pane
    - [ ] set filetype (like json/html/xml) for lang support
  - [ ] show debug output in debug console of vscode
- [ ] parse `.dothttp.json` from http file dir and list environments (tree view)
  - [ ] `*` env properties should show with name `default` and bold
  - [ ] `headers` section with bold (as its applied for all)
  - [ ] rest environments list
    - [ ] checkbox to enable environments
  - [ ] expand of any above section should show display properties
  - [ ] on double click it should open file (to currect position) ??????
- [ ] should be able to set properties from side left pane
- [ ] remember last run environments , properties for each file.
  - [ ] close and open same *httpfile*. it should set same enabled properties


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
