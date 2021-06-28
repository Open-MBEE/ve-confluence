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

## Testing

[Cypress](https://www.cypress.io/) is used for end-to-end testing.

To run Cypress create a `cypress.env.json` file in the project's root directory. Use the sample `cypress-sample.env.json` as a reference for the needed variables.

| Variable | Description                                 |
| ---- | ---------------------------------------- |
| confluence_base | Confluence base url |
| confluence_space | Confluence space, used in URL schema  |
| confluence_username  | Log in user |
| confluence_password   | Log in password |
| username_field | DOM query identifier for the username field. Example: `#username_field`  |
| password_field | DOM query identifier for the password field. Example: `#password_field`   |

Run Cypress:
```shell
npm run cypress:open
```

Once the Cypress window is open, click on the test you would like to run.