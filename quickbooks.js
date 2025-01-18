'use strict';

const path = require('path');
const OAuthClient = require('intuit-oauth');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { parse: json2csv } = require('json2csv');
const mid = require('./middleware.js');
const creds = require('./credentials');
const db = require('./database.js');
require('dotenv').config();

let oauth2_token_json = null;
let oauthClient = null;

/**
 * Initialize OAuth Client
 */
function initializeOAuthClient() {
  oauthClient = new OAuthClient({
    clientId: creds.quickbooks.consumerKey,
    clientSecret: creds.quickbooks.consumerSecret,
    environment: creds.quickbooks.environment,
    redirectUri: `${creds.domain}/callback`,
  });
}

/**
 * Sync Customers from QuickBooks to Database
 */
async function syncCustomers() {
  console.log('Syncing customers from QuickBooks to the database');
  try {
    const companyID = oauthClient.getToken().realmId;
    const url =
      oauthClient.environment === 'sandbox'
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    const response = await oauthClient.makeApiCall({
      url: `${url}v3/company/${companyID}/query?query=select * from Customer`,
    });
    const customers = response.json.QueryResponse.Customer;

    if (!customers || customers.length === 0) {
      console.log('No customers found to sync.');
      return;
    }

    const sql = `
      INSERT INTO customers (id, FullyQualifiedName, primary_email_address, phone, taxable) VALUES ?
      ON DUPLICATE KEY UPDATE
      FullyQualifiedName = VALUES(FullyQualifiedName),
      primary_email_address = VALUES(primary_email_address),
      phone = VALUES(phone),
      taxable = VALUES(taxable)
    `;

    const values = customers.map((customer) => [
      customer.Id,
      customer.DisplayName,
      customer.PrimaryEmailAddr?.Address || null,
      customer.PrimaryPhone?.FreeFormNumber || null,
      customer.Taxable,
    ]);

    db.query(sql, [values], (err) => {
      if (err) {
        console.error('Error inserting customers into database:', err);
        return;
      }
      console.log(`${values.length} customers synced successfully.`);
    });
  } catch (error) {
    console.error('Error syncing customers:', error);
  }
}

module.exports = function (app) {
  const urlencodedParser = bodyParser.urlencoded({ extended: false });
  app.use(bodyParser.json());

  /**
   * Routes
   */
  app.get('/quickbooks', mid.isAuth, (req, res) => {
    res.render('quickbooks.html');
  });

  app.get('/authUri', urlencodedParser, (req, res) => {
    initializeOAuthClient();
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId, OAuthClient.scopes.Profile, OAuthClient.scopes.Email],
      state: 'intuit-test',
    });
    res.send(authUri);
  });

  app.get('/callback', async (req, res) => {
    try {
      const authResponse = await oauthClient.createToken(req.url);
      oauth2_token_json = JSON.stringify(authResponse.json, null, 2);
      console.log('OAuth Token:', oauth2_token_json);

      // Start syncing customers after authentication
      await syncCustomers();
      res.send('Callback success. Customers syncing...');
    } catch (error) {
      console.error('Error during callback:', error);
      res.status(500).send('Callback error');
    }
  });

  app.get('/getCompanyInfo', mid.isAuth, async (req, res) => {
    try {
      const companyID = oauthClient.getToken().realmId;
      const url =
        oauthClient.environment === 'sandbox'
          ? OAuthClient.environment.sandbox
          : OAuthClient.environment.production;

      const response = await oauthClient.makeApiCall({
        url: `${url}v3/company/${companyID}/companyinfo/${companyID}`,
      });
      res.json(response.json);
    } catch (error) {
      console.error('Error fetching company info:', error);
      res.status(500).send('Error fetching company info');
    }
  });

  app.get('/getCustomersFromQuickbooks', mid.isAuth, async (req, res) => {
    try {
      const companyID = oauthClient.getToken().realmId;
      const url =
        oauthClient.environment === 'sandbox'
          ? OAuthClient.environment.sandbox
          : OAuthClient.environment.production;

      const response = await oauthClient.makeApiCall({
        url: `${url}v3/company/${companyID}/query?query=select * from Customer`,
      });

      const customers = response.json.QueryResponse.Customer;
      const sql = 'INSERT INTO customers (id, FullyQualifiedName, PrimaryEmailAddr_Address, PrimaryPhone_FreeFormNumber, taxable) VALUES ?';
      const values = customers.map((customer) => [
        customer.Id,
        customer.DisplayName,
        customer.PrimaryEmailAddr?.Address || null,
        customer.PrimaryPhone?.FreeFormNumber || null,
        customer.Taxable,

      ]);

      db.query(sql, [values], (err) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).send('Error syncing customers');
          return;
        }
        res.send(`${values.length} customers synced successfully.`);
      });
    } catch (error) {
      console.error('Error syncing customers from QuickBooks:', error);
      res.status(500).send('Error syncing customers');
    }
  });

  app.get('/retrieveToken', mid.isAuth, (req, res) => {
    res.send(oauth2_token_json);
  });

  app.get('/refreshAccessToken', async (req, res) => {
    try {
      const authResponse = await oauthClient.refresh();
      console.log('Refresh Token:', JSON.stringify(authResponse.json));
      oauth2_token_json = JSON.stringify(authResponse.json, null, 2);
      res.send(oauth2_token_json);
    } catch (error) {
      console.error('Error refreshing access token:', error);
      res.status(500).send('Error refreshing access token');
    }
  });
};
