describe('hover tooltip', function() {
    before(() => {
        cy.login()
        cy.visit('/Hover+Tooltip+Test')
    })

    it('display tooltip on hover', function(){

        const description = Cypress.$('#test_hover_tooltip').attr("original-title")

        cy.get('#test_hover_tooltip').trigger('mouseover')
        cy.get('.tipsy-inner').should(($el) => {
            expect($el).to.be.visible
            expect($el).to.have.text(description)
        })
    })
})
