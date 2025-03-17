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
var Quickbooks = require('node-quickbooks');
var request = require('request');
var qs = require('querystring');


let oauth2_token_json = null;
let oauthClient = null;
var qbo = null;

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

    let startPosition = 1;
    const maxResults = 1000; // QuickBooks API cap
    let totalSynced = 0;

    while (true) {
      const response = await oauthClient.makeApiCall({
        url: `${url}v3/company/${companyID}/query?query=select * from Customer startposition ${startPosition} maxresults ${maxResults}`,
      });
      const customers = response.json.QueryResponse.Customer;

      if (!customers || customers.length === 0) {
        console.log('No more customers to sync.');
        break;
      }

      console.log(customers.length, 'customers found to sync.');

      const sql = `
        INSERT INTO customers (id, givenName, CompanyName, primary_email_address, phone, taxable, job, billing_address) VALUES ?
        ON DUPLICATE KEY UPDATE
        givenName = VALUES(givenName),
        CompanyName = VALUES(CompanyName),
        primary_email_address = VALUES(primary_email_address),
        phone = VALUES(phone),
        taxable = VALUES(taxable),
        job = VALUES(job),
        billing_address = VALUES(billing_address);
      `;
      const values = customers
        .filter((customer) => customer.Job == false ) 
        .map((customer) => [
          customer.Id,
          (customer.GivenName || '') + ' ' + (customer.FamilyName || customer.FullyQualifiedName),
          customer.FullyQualifiedName,
          customer.PrimaryEmailAddr?.Address || null,
          customer.PrimaryPhone?.FreeFormNumber || null,
          customer.Taxable,
          customer.Job,
          customer.BillAddr?.Line1 && customer.BillAddr?.City && customer.BillAddr?.CountrySubDivisionCode && customer.BillAddr?.PostalCode
        ? `${customer.BillAddr.Line1}, ${customer.BillAddr.City}, ${customer.BillAddr.CountrySubDivisionCode} ${customer.BillAddr.PostalCode}`
        : 'Unknown Address',
        ]);

      db.query(sql, [values], (err) => {
        if (err) {
          console.error('Error inserting customers into database:', err);
          return;
        }
        console.log(`${values.length} customers synced successfully.`);
      });

      totalSynced += customers.length;
      startPosition += maxResults;
    }

    console.log(`Total customers synced: ${totalSynced}`);
  } catch (error) {
    console.error('Error syncing customers:', error);
  }
}

// function to create an invoice given an invoice_id, takeoff_id, and callback
async function pushInvoiceToQuickbooks (invoice_id, callback) {
  // get the invoice from the database
  db.getInvoiceById(invoice_id, async (err, invoice) => {
    if (err) {
      console.log(err);
      return callback("big error", null);
    } else {
      console.log(invoice);
      if (invoice.invoice_hash) {
        // first check if the oauthClient is initialized
        if (!oauthClient) {
          initializeOAuthClient();
        }

        // get the companyID from the token
        const companyID = oauthClient.getToken().realmId;
        const url =
          oauthClient.environment === 'sandbox'
            ? OAuthClient.environment.sandbox
            : OAuthClient.environment.production;

        console.log(invoice);
        // make the api call to create the invoice
        let response;
        try {
          
          response = await oauthClient.makeApiCall({
            url: `${url}v3/company/${companyID}/invoice?minorversion=75`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              "Line": [
                {
                  "DetailType": "SalesItemLineDetail", 
                  "Amount": invoice.invoiceTotal, 
                  "SalesItemLineDetail": {
                    "ItemRef": {
                      "name": "Services rendered to " + invoice.takeoffName, 
                      "value": "1"
                    }
                  }
                }
              ], 
              "CustomerRef": {
                "value": invoice.customer_id
              }
            },
          });



          console.log('response from qb:', response.json);
          if (response.json.Invoice && response.json.Invoice.DocNumber) {
            let qb_invoice_number = response.json.Invoice.DocNumber;

            // update the invoice in the database with the qb_invoice_number
            db.updateInvoiceWithQBNumber(invoice_id, qb_invoice_number, (err, result) => {
              if (err) {
                console.log(err);
              } else {
                console.log(result);
                return callback(null, response.json);
              }
            });

          } else {
            console.log("Error creating invoice");
            callback(err, null);
          }

        } catch (error) {
          console.error('Error creating invoice:');
          return callback(error, null);
        }

     


        //callback(null, response.json);
      } else {
        console.log("Some info is missing from this invoice invoice.hash");
      return callback("Some info is missing from this invoice invoice.hash", null);

      }
    }
  });
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

  app.get('/callback', async function(req, res) {
    try {
      const authResponse = await oauthClient.createToken(req.url);
      oauth2_token_json = JSON.stringify(authResponse.getJson(), null, 2);

      // save the access token somewhere on behalf of the logged in user
      qbo = new Quickbooks(creds.quickbooks.consumerKey,
                           creds.quickbooks.consumerSecret,
                           authResponse.getToken().access_token,
                           false, // no token secret for OAuth 2.0
                           authResponse.getToken().realmId,
                           false, // use the Sandbox
                           true, // turn debugging on
                           '75', // minorversion
                           '2.0', // OAuth version
                           authResponse.getToken().refresh_token);
      await syncCustomers();
      //test out account access
      // qbo.findAccounts(function(_, accounts) {
      //   accounts.QueryResponse.Account.forEach(function(account) {
      //     console.log(account.Name);
      //   });
      // });


      // Start syncing invoices after authentication
      // get all the qb invoices and create them in the database if they don't exist

      qbo.findInvoices({ }, async function (err, invoices) {
        console.log(invoices.Error);
        if (err) {
          console.log(err);
          return;
        }
        for (var i = 0; i < invoices.QueryResponse.Invoice.length; i++) {
          let invoice = invoices.QueryResponse.Invoice[i];
          let total = 0;
          for (var j = 0; j < invoice.Line.length; j++) {
            total += invoice.Line[j].Amount;
            // get line items?
          }

          //  get the takeoff with a matching customer_id

        //  console.log(invoice);
          db.getTakeoffByCustomerID(invoice.CustomerRef.value, (err, takeoff) => {
          
            if (err || !takeoff) {
              console.log(err);
              return;
            }


            //console.log(takeoff);
          const sql = `
            INSERT INTO invoices (qb_number, invoice_number, takeoff_id, total, due_date, created_at, hash) VALUES ?
            ON DUPLICATE KEY UPDATE
            qb_number = VALUES(qb_number),
            takeoff_id = VALUES(takeoff_id),
            total = VALUES(total),
            due_date = VALUES(due_date),
            created_at = VALUES(created_at),
            hash = VALUES(hash);
          `;
          const values = [[
            invoice.DocNumber,
            Math.floor(Math.random() * 1000000),
            takeoff.takeoff_id,
            total,
            invoice.DueDate,
            invoice.TxnDate,
            crypto.createHash('md5').update(JSON.stringify(invoice)).digest('hex'),
          ]];

          db.query(sql, [values], (err) => {
            if (err) {
              console.error('Error inserting invoice into database:', err);

              console.log("takeoff_id", takeoff);
              return;
            }
            console.log('Invoice synced successfully.');
          });

        });
        }
      }
      );
      

      res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.reload(); window.close();</script></body></html>');
    } catch (error) {
      console.error('Error during callback:', error);
      res.status(500).send('Callback error');
    }
  });
  // app.get('/callback', async (req, res) => {
  //   try {
  //     const authResponse = await oauthClient.createToken(req.url);
  //     //oauth2_token_json = JSON.stringify(authResponse.json, null, 2);

  //     // Start syncing customers after authentication
  //     await syncCustomers();

  //     qbo = new Quickbooks(creds.quickbooks.consumerKey,
  //       creds.quickbooks.consumerSecret,
  //       oauthClient.getToken().accessToken,
  //       null, // no token secret for oAuth 2.0
  //       oauthClient.getToken().realmId,
  //       true, // use the sandbox?
  //       true, // enable debugging?
  //       '75', // set minorversion, or null for the latest version
  //       '2.0', //oAuth version
  //       oauthClient.getToken().refreshToken);

  //       // test request
  //       qbo.findCustomers({ maxResults: 5 }, function (err, customers) {
  //         console.log(customers);
  //       });


  //     res.send('Callback success. Customers syncing...');
  //   } catch (error) {
  //     console.error('Error during callback:', error);
  //     res.status(500).send('Callback error');
  //   }
  // });

  app.post("/pushInvoiceToQuickbooks", async (req, res) => {
    console.log("pushInvoiceToQuickbooks");
    // query the database for the invoice_id and takeoff_id in the post req
    let invoice_id = req.body.invoice_id;

    // call the pushInvoiceToQuickbooks function
    pushInvoiceToQuickbooks(invoice_id, (err, response) => {
      if (err) {
        console.log("qb error:",err);
        res.send("error");
            } else {
        console.log(response);
        res.send("shared");
      }
    }
    );
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
      console.log('Customers:', customers);
      const sql = 'INSERT INTO customers (id, givenName, CompanyName, primary_email_address, owner_billing_address, phone, taxable) VALUES ?';
      const values = customers.map((customer) => [
        customer.Id,
        customer.GivenName + ' ' + customer.FamilyName,
        customer.FullyQualifiedName,
        customer.PrimaryEmailAddr?.Address || null,
        customer.BillAddr?.Line1 || null,
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

    

  // app.post('/webhook', async (req, res) => {


    

  //   let payload = req.body;
  //   console.log('Webhook payload:', payload);

  //   // Verify the signature given by creds.quickbooks.webhooksVerifier

  //   if (oauthClient && oauthClient.isAccessTokenValid()) {
  //     console.log('The access_token is valid');
  //   }
    
  //   if (!oauthClient.isAccessTokenValid()) {
  //     oauthClient
  //       .refresh()
  //       .then(function (authResponse) {
  //         console.log('Tokens refreshed : ' + JSON.stringify(authResponse.getToken()));
  //       })
  //       .catch(function (e) {
  //         console.error('The error message is :' + e.originalMessage);
  //         console.error(e.intuit_tid);
  //       });
  //   }

  
   
    
  //   for (var i = 0; i < payload.eventNotifications.length; i++) {
  //     let event = payload.eventNotifications[i];
  //     console.log('Event:', event);
  //     let realmId = event.realmId;
  //     let dataChangeEvent = event.dataChangeEvent;
  //     let entities = dataChangeEvent.entities;
  //     console.log('Entities:', entities);

  //     for (var j = 0; j < entities.length; j++) {
  //       let entity = entities[j];
  //       let operation = entity.operation;
  //       let changedFields = entity.changedFields;
  //       let entityType = entity.name;
  //       console.log('Entity:', entity);

  //       if (operation === 'Create' || operation === 'Update') {
  //         if (entityType === 'Customer') {
  //           let customerID = entity.id;
  //           qbo.findCustomers({field:'Id',value:entity.id,operator:'LIKE'}, function (e, customers) {
  //             if (e) {
  //               console.log(e);
  //             } else {
  //               console.log('Customer:', customers);

  //               req.end();
  //             }
  //           }
  //           );
  //          // console.log('Customer:', customers.json.Customer);
  //         } else if (entityType === 'Invoice') {
  //           let invoiceID = entity.id;
  //           // first check if the oauthClient is initialized
  //           if (!oauthClient) {
  //             initializeOAuthClient();
  //           }
  //           // make the api call to get the invoice
  //           let invoice = await oauthClient.makeApiCall({
  //             url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice/${invoiceID}`,
  //           });
  //           console.log('Invoice:', invoice.json.Invoice);


  //           // sum the line items to get the total amount
  //           let total = 0;
  //           for (var k = 0; k < invoice.json.Invoice.Line.length; k++) {
  //             total += invoice.json.Invoice.Line[k].Amount;
  //           }

  //           // Sync invoice to database
  //           const sql = `
  //             INSERT INTO invoices (id, customer_id, total, due_date, invoice_date, hash) VALUES ?
  //             ON DUPLICATE KEY UPDATE
  //             customer_id = VALUES(customer_id),
  //             total = VALUES(total),
  //             due_date = VALUES(due_date),
  //             invoice_date = VALUES(invoice_date),
  //             total = VALUES(total),
  //             hash = VALUES(hash);
  //           `;
  //           const values = [[
  //             invoice.json.Invoice.Id,
  //             invoice.json.Invoice.CustomerRef.value,
  //             total,
  //             invoice.json.Invoice.DueDate,
  //             invoice.json.Invoice.TxnDate,
  //             invoice.json.Invoice.Balance,
  //             crypto.createHash('md5').update(JSON.stringify(invoice.json.Invoice)).digest('hex'),
  //           ]];

  //           db.query(sql, [values], (err) => {
  //             if (err) {
  //               console.error('Error inserting invoice into database:', err);
  //               return;
  //             }
  //             console.log('Invoice synced successfully.');
  //           });

  //         }
  //       }
  //     }
  //   }
  // });

  

}
