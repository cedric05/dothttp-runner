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

<img src="./demo.gif" >


## dothttp notebook (preview)

<img src="https://user-images.githubusercontent.com/11557066/117543419-6724f880-b03a-11eb-9b7b-d81db7938fd9.png">

## Preview noteboook
Users can try notebook feature by installing extension from vsix file in these [github actions](https://github.com/cedric05/dothttp-runner/actions/workflows/commit-artifact.yml) for example [preview](https://github.com/cedric05/dothttp-runner/suites/2803281233/artifacts/62337942)


notebook feature is only available in vscode-insiders

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