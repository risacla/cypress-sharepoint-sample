// @ts-check
/// <reference types="cypress" />

describe('SharePoint SPFx Testing', function() {
  const PAGE_URL = "https://scubed.sharepoint.com/sites/DocuSign_TEST/Shared%20Documents/Forms/AllItems.aspx";
  
  /**
   * Before visiting SharePoint, we first need to authenticate
   */
  before(() =>  {
    cy.visitSP(PAGE_URL);
  });

  /**
   * After all tests
   */
  //after(() => {
    // Wait 1sec for the video
    //cy.wait(1000);
  //});

  /**
   * Check if the homepage can be opened
   */
  it('Validate page title', () => {
    cy.title().should('eq', 'EDMS - Documents - All Documents');
  });
  
  /**
   * Validate what you want to validate
   */
  //it('Validate if there are two images on the page', () => {
    //cy.get('div[data-testid="brickheadz"] img').should('have.length', 2);
  //});

  /**
   * New CV template
   */
  it('Validate if the new template is created', () => {
    cy.contains('New').click()
    //cy.wait(1000);
    //cy.get('#id__2-menu > div > ul > li:nth-child(3) > button').click()
    //cy.wait(1000);

    cy.contains('CV_Template').click()
    

  });

})