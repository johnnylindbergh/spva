var QuickBooks = require('node-quickbooks');
var creds = require('./credentials');

// get oauth2 tokens

const OAuthClient = require('intuit-oauth');




function getCustomers(req, res, cb) {

    const oauthClient = new OAuthClient({
        clientId: creds.quickbooks.consumerKey,
        clientSecret: creds.quickbooks.consumerSecret,
        environment: 'sandbox',
        redirectUri: creds.domain+'/callback',
      });
      
      
        // AuthorizationUri
        const authUri = oauthClient.authorizeUri({
          scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
          state: 'testState',
        }); // can be an array of multiple scopes ex : {scope:[OAuthClient.scopes.Accounting,OAuthClient.scopes.OpenId]}
        
        // Redirect the authUri
        res.redirect(authUri);
        //console.log(authUri);
        
}   
                          
module.exports = {
    getCustomers: getCustomers,
};