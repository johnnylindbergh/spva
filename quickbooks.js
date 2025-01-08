var QuickBooks = require('node-quickbooks');
const mid = require("./middleware.js");
var creds = require('./credentials');
var axios = require('axios');
let db = require('./database.js');

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
const { DB_NAME } = require('./settings.js');
const { devNull } = require('os');
const urlencodedParser = bodyParser.urlencoded({ extended: false });

/**
 * App Variables
 * @type {null}
 */
let oauth2_token_json = null;
let redirectUri = creds.domain + '/callback';
let oauthClient = null;

/**
 * Instantiate new Client
 * @type {OAuthClient}
 */

function syncCustomers() {
  console.log("Syncing customers from QuickBooks to the database");
  const companyID = oauthClient.getToken().realmId;
  // Determine the environment URL
  const url =
    oauthClient.environment === 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  // Fetch customers from QuickBooks
  oauthClient
    .makeApiCall({ url: `${url}v3/company/${companyID}/query?query=select * from Customer` })
    .then(function (authResponse) {
      console.log(`\n The response for API call is : ${JSON.stringify(authResponse.json)}`);
      
      // Extract customers from the response
      const customers = authResponse.json.QueryResponse.Customer;

      // Prepare the SQL INSERT statement
      const sql = `
        INSERT INTO customers (id, Taxable, BillAddr_Id, BillAddr_Line1, BillAddr_City, 
          BillAddr_CountrySubDivisionCode, BillAddr_Country, BillAddr_PostalCode, 
          BillAddr_Lat, BillAddr_Long, ShipAddr_Id, ShipAddr_Line1, ShipAddr_City, 
          ShipAddr_CountrySubDivisionCode, ShipAddr_Country, ShipAddr_PostalCode, 
          ShipAddr_Lat, ShipAddr_Long, Job, BillWithParent, ParentRef_Value, 
          Level, Balance, BalanceWithJobs, CurrencyRef_Value, CurrencyRef_Name, 
          PreferredDeliveryMethod, Domain, Sparse, SyncToken, MetaData_CreateTime, 
          MetaData_LastUpdatedTime, GivenName, MiddleName, FamilyName, FullyQualifiedName, 
          CompanyName, DisplayName, PrintOnCheckName, Active, PrimaryPhone_FreeFormNumber, 
          Mobile_FreeFormNumber, PrimaryEmailAddr_Address, WebAddr_URI
        ) VALUES ?
      `;

      // Prepare values for batch insertion
      const values = customers.map(customer => {
        return [
          customer.Id || null,
          customer.Taxable || false,
          customer.BillAddr?.Id || null,
          customer.BillAddr?.Line1 || null,
          customer.BillAddr?.City || null,
          customer.BillAddr?.CountrySubDivisionCode || null,
          customer.BillAddr?.Country || null,
          customer.BillAddr?.PostalCode || null,
          customer.BillAddr?.Lat || null,
          customer.BillAddr?.Long || null,
          customer.ShipAddr?.Id || null,
          customer.ShipAddr?.Line1 || null,
          customer.ShipAddr?.City || null,
          customer.ShipAddr?.CountrySubDivisionCode || null,
          customer.ShipAddr?.Country || null,
          customer.ShipAddr?.PostalCode || null,
          customer.ShipAddr?.Lat || null,
          customer.ShipAddr?.Long || null,
          customer.Job || false,
          customer.BillWithParent || false,
          customer.ParentRef?.value || null,
          customer.Level || null,
          customer.Balance || 0,
          customer.BalanceWithJobs || 0,
          customer.CurrencyRef?.value || null,
          customer.CurrencyRef?.name || null,
          customer.PreferredDeliveryMethod || null,
          customer.domain || null,
          customer.sparse || false,
          customer.SyncToken || null,
          customer.MetaData?.CreateTime || null,
          customer.MetaData?.LastUpdatedTime || null,
          customer.GivenName || null,
          customer.MiddleName || null,
          customer.FamilyName || null,
          customer.FullyQualifiedName || null,
          customer.CompanyName || null,
          customer.DisplayName || null,
          customer.PrintOnCheckName || null,
          customer.Active || false,
          customer.PrimaryPhone?.FreeFormNumber || null,
          customer.Mobile?.FreeFormNumber || null,
          customer.PrimaryEmailAddr?.Address || null,
          customer.WebAddr?.URI || null
        ];
      });

      // Execute the batch insertion
      db.query(sql, [values], function (err) {
        if (err) {console.log(err);}
        // if theres a mismatch in the number of columns, check the number of columns in the sql statement

      });
    })
    .catch(function (e) {
      console.error(e);
    });
}






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

      // call the getCustomers function
      syncCustomers();

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

/** this function will get all the customers from quickbooks and insert them into the database */
app.get('/getCustomersFromQuickbooks', mid.isAuth, function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({ url: `${url}v3/company/${companyID}/query?query=select * from Customer` })
    .then(function (authResponse) {
      console.log(`\n The response for API call is :${JSON.stringify(authResponse.json)}`);
      // make a batch sql call to insert the customers into the database
      let customers = authResponse.json.QueryResponse.Customer;
      let sql = "INSERT INTO customers (id, name, email, phone) VALUES ?";
      let values = [];
      customers.forEach(customer => {
        values.push([customer.Id, customer.DisplayName, customer.PrimaryEmailAddr.Address, customer.PrimaryPhone.FreeFormNumber]);
      });
      db.query(sql, [values], function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
      }
      );

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