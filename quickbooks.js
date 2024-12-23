var QuickBooks = require('node-quickbooks');
const mid = require("./middleware.js");
var creds = require('./credentials');
var axios = require('axios');

'use strict';

require('dotenv').config();

/**
 * Require the dependencies
 * @type {*|createApplication}
 */
const express = require('express');

const path = require('path');
const OAuthClient = require('intuit-oauth');
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false });

/**
 * App Variables
 * @type {null}
 */
let oauth2_token_json = null;
let redirectUri = creds.domain + '/callback';

/**
 * Instantiate new Client
 * @type {OAuthClient}
 */

let oauthClient = null;



module.exports = function(app) {

/**
 * Configure View and Handlebars
 */
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, '/public')));
// app.engine('html', require('ejs').renderFile);

// app.set('view engine', 'html');
// app.use(bodyParser.json());

// const urlencodedParser = bodyParser.urlencoded({ extended: false });


app.get('/quickbooks', mid.isAuth, function (req, res) {
    res.render('quickbooks.html');
});




  app.get('/getCompanyInfo', mid.isAuth, function (req, res) {
    const companyID = oauthClient.getToken().realmId;
  
    const url =
      oauthClient.environment == 'sandbox'
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    const invoiceNumber = req.body.invoiceNumber;
  
    oauthClient
      .makeApiCall({ url: `${url}v3/company/${companyID}/invoice/${invoiceNumber}/pdf?minorversion=59` })
      .then(function (authResponse) {
        console.log(`\n The response for API call is :${JSON.stringify(authResponse.json)}`);
        res.send(authResponse.json);
      })
      .catch(function (e) {
        console.error(e);
      });
  });


app.get('/authUri', urlencodedParser, function (req, res) {

    console.log(req.query.json);
  oauthClient = new OAuthClient({
    clientId: creds.quickbooks.consumerKey,
    clientSecret: creds.quickbooks.consumerSecret,
    environment: creds.quickbooks.environment,
    redirectUri: creds.domain + '/callback',
  });

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId, OAuthClient.scopes.Profile, OAuthClient.scopes.Email],
    state: 'intuit-test',
  });
  res.send(authUri);
});

/**
 * Handle the callback to extract the `Auth Code` and exchange them for `Bearer-Tokens`
 */
app.get('/callback', function (req, res) {
  oauthClient
    .createToken(req.url)
    .then(function (authResponse) {
      oauth2_token_json = JSON.stringify(authResponse.json, null, 2);
      console.log(`The Token is  ${oauth2_token_json}`);
    })
    .catch(function (e) {
      console.error(e);
    });

  res.send('');
});

/**
 * Display the token : CAUTION : JUST for sample purposes
 */
app.get('/retrieveToken', mid.isAuth, function (req, res) {
  res.send(oauth2_token_json);
});

/**
 * Refresh the access-token
 */
app.get('/refreshAccessToken', function (req, res) {
  oauthClient
    .refresh()
    .then(function (authResponse) {
      console.log(`\n The Refresh Token is  ${JSON.stringify(authResponse.json)}`);
      oauth2_token_json = JSON.stringify(authResponse.json, null, 2);
      res.send(oauth2_token_json);
    })
    .catch(function (e) {
      console.error(e);
    });
});

/**
 * getCompanyInfo ()
 */
app.get('/getCompanyInfo', mid.isAuth, function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({ url: `${url}v3/company/${companyID}/companyinfo/${companyID}` })
    .then(function (authResponse) {
      console.log(`\n The response for API call is :${JSON.stringify(authResponse.json)}`);
      res.send(authResponse.json);
    })
    .catch(function (e) {
      console.error(e);
    });
});

app.get('/getCustomers', mid.isAuth, function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({ url: `${url}v3/company/${companyID}/query?query=select * from Customer` })
    .then(function (authResponse) {
      console.log(`\n The response for API call is :${JSON.stringify(authResponse.json)}`);
      res.send(authResponse.json);
    })
    .catch(function (e) {
      console.error(e);
    });
});

app.get('/currentBalance', mid.isAuth, function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({ url: `${url}v3/company/${companyID}/companyinfo/${companyID}` })
    .then(function (authResponse) {
      console.log(`\n The response for API call is :${JSON.stringify(authResponse.json)}`);
      res.send(authResponse.json.CompanyInfo.BalanceWithSubAccounts);
    })
    .catch(function (e) {
      console.error(e);
    });
});


app.get('/getJobs', mid.isAuth, function (req, res) {
  const companyID = oauthClient.getToken().realmId;
  
  const url = oauthClient.environment == 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production;
  oauthClient
    .makeApiCall({ url: `${url}v3/company/${companyID}/query?query=select * from Job` })
    .then(function (authResponse) {
      console.log(`\n The response for API call is :${JSON.stringify(authResponse.json)}`);
      res.send(authResponse.json);
    })
    .catch(function (e) {
      console.error(e);
    });
});

  // Create an Invoice
app.post('/create-invoice', async (req, res) => {
    try {
      const invoiceData = {
        Line: [
          {
            Amount: req.body.amount,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: req.body.itemRef },
            },
          },
        ],
        CustomerRef: { value: req.body.customerRef },
      };

      const response = await axios.post(
        `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice`,
        invoiceData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error creating invoice.');
    }
  });

/**
 * disconnect ()
 */
app.get('/disconnect', function (req, res) {
  console.log('The disconnect called ');
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.OpenId, OAuthClient.scopes.Email],
    state: 'intuit-test',
  });
  res.redirect(authUri);
});
};