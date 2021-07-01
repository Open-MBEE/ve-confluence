// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

Cypress.Commands.add('login', () => {

    // Log in using values found in cypress.env.json
    cy.visit('/')
    cy.get(Cypress.env('username_field')).type(Cypress.env('confluence_username'))
    cy.get(Cypress.env('password_field')).type(`${Cypress.env('confluence_password')}{enter}`, { log: false })
});

Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
    const space = Cypress.env('confluence_space')
    return originalFn(`${Cypress.env('confluence_base')}/display/${space}${url}`, options)
})