# Http Client for vscode (dothttp-runner)


Checkout [docs](https://docs.dothttp.dev)

checkout [dothttp(dsl for http)](https://github.com/cedric05/dothttp).

Checkout [playground](http://ghpage.dothttp.dev/)

view product post [here](https://www.producthunt.com/posts/dothttp)

## OUR MOTO

Save and re-use later

## Features

- Run http file in editor itself
- load .dothttp.json into editor
- open `.dothttp.json` from env view for easy edit
- set environements from editor (copy property)
- properties from editor (add, update, delete, copy, disable all)
- change environments priority
- open executed file in seperate tab with content-type
- creates history entry for requests, can be viewable
- http notebook, view requests & response in single pane itself(like repl)
- import postman collection
- import swagger collection
- import curl
- export to postman collection
- export to most well known programming languages
- InLine show errors
- InLine suggestion

<img src="./demo.gif" >


## dothttp notebook

<img src="notebook.png">

## Known issues
- notebook search with `m` or `y` in key won't work, as vscode configured default shortcut `m` to change cell to markdown and is annoying. [remove](https://code.visualstudio.com/docs/getstarted/keybindings#_keyboard-shortcuts-editor) `m` and `y` shortcuts for clean experience.


example http file
```
# users.http

#!/usr/bin/env /home/prasanth/cedric05/dothttp/dist/dothttp-cli

# this is comment

// this is also a comment

/*
   this is multi line
   comment
*/

# http file can have multiple requests, name tag/annotation is used to identify
@name("fetch 100 users, skip first 50")

# makes are get request, with url `https://req.dothttp.dev/user`
GET https://req.dothttp.dev/user

# below is an header example, if api_key is not defined, it will be defaulted to `121245454125454121245451`
"Authorization": "Basic dXNlcm5hbWU6cGFzc3dvcmQ="

# below is how you set url params '?' --> signifies url quary param
? ("fetch", "100") #
? ("skip", "50")
? projection, name
? projection, org
? projection, location




# makes are post request, with url `https://req.dothttp.dev/user`
POST https://req.dothttp.dev/user

basicauth('username', 'password')
/*
   below defines payload for the post request.
   json --> signifies payload is json data
*/
json({
    "name": "{{name=adam}}", # name is templated, if spcified via env or property, it will be replaced
    "org": "dothttp",
    "location": "Hyderabad",
    # "interests": ["exploring", "listening to music"],
})



# makes put request, with url `https://req.dothttp.dev/user/1`
PUT https://req.dothttp.dev/post

# define headers in .dothttp.json with env
basicauth("{{username}}, "{{password}}")

# posts with urlencoded
data({
    "name": "Adam {{$randomStr}}",
    "org": "dothttp",
    "location": "Hyderabad",
    "interests": ["exploring", "listening to music"],
})

// or use below one
// data('name=Adam+A&org=dothttp&location=Hyderabad&interests=%5B%27exploring%27%2C+%27listening+to+music%27%5D')


```

support us via upvoting in [producthunt](https://www.producthunt.com/posts/dothttp) & starring in [github](https://github.com/cedric05/dothttp-runner)

-----------
### Vscode alternatives

- [rest-client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) written in typescript
- [httpYac](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac)  written in typescript
- [Thunder Client](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client) closed source

---------
### Non Vscode alternatives
- [http-client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html)  closed source
- [dothttp](https://github.com/tonsV2/dothttp)  written in python
