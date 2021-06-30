# Developer Guide

## Installation

After cloning the repository, install git submodules:
```shell
git submodule init && git submodule update
```

Install the dependencies and necessary build tools:
```shell
yarn install
```


## Setup for VS Code

Requirements for the [VS Code](https://code.visualstudio.com/) IDE:
 - [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
 - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
 - [Typescript >=4.3.4](https://stackoverflow.com/a/39676463)


## Contributing and Running Locally

The following environment variables are required when building:

```shell
SPARQL_ENDPOINT
DOORS_NG_PREFIX
```

For example, on \*nix, create a `.env` file:
```bash
#!/bin/bash
export SPARQL_ENDPOINT='https://graph.xyz.org/sparql'
export DOORS_NG_PREFIX='https://jazz.xyz.org/rm/web#'
```


To build the output javascript bundle:

```shell
source .env; yarn build
```

Or better yet, for development:

```shell
source .env; yarn dev
```

## Development on Confluence

1. Install the [Tampermonkey extension](https://www.tampermonkey.net/) in your browser. Supports: Chrome, Brave, Microsoft Edge, Safari, Firefox, Opera Next, Dolphin Browser, and UC Browser
2. Create a new script and paste the following:
```js
// ==UserScript==
// @name         VE4 Confluence UI
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  For VE4 development within Confluence
// @author       blake.d.regalia@jpl.nasa.gov
// @include      https://{WIKI.XYZ.ORG}/display/{SPACE_KEY}/*
// @exclude      https://{WIKI.XYZ.ORG}/display/{SPACE_KEY}/*.uat*
// @grant        none
// ==/UserScript==

(function() {
    const dm_script=document.createElement('script');
    dm_script.src='http://localhost:3001/public/build/bundle.js';
    document.body.appendChild(dm_script)
})();

```
3. Edit the appropriate substitutions in the script for the include and exclude URLs
4. Open a terminal in the project root directory and run `$ python -m SimpleHTTPServer 3001`
5. Open the wiki to a sample page and click the Tampermonkey extension to reload the page and enable the script

