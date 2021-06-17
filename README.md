# view-editor-4

Injects interactive components into a live Confluence Wiki page.

## Contributing and Running Locally

After cloning the repository, install git submodules:
```shell
git submodule init && git submodule update
```

The following environment variables are required when building:

```shell
SPARQL_ENDPOINT
```

For example, on *nix, create a `.env` file:
```bash
#!/bin/bash
export SPARQL_ENDPOINT='https://my-sparql-endpoint/sparql'
```

Install the dependencies and necessary build tools:
```shell
npm install
```

To build the output javascript bundle:

```shell
npm run build
```

Or better yet, for development:

```shell
npm run dev
```
