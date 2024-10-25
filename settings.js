
/*
  settings.js: System parameters
*/

module.exports = {

  // server port
  PORT: 5000,

  // is the system in development mode (explicit error messages, etc)
  DEV_MODE: false,

  // name of database
  DB_NAME: 'spvaTrack',

  // domain through which server is accessible
  DOMAIN: 'https://estimate.sunpaintingva.com',

  /*  does the system allow automatic creation of new user accounts
      when authentication is attempted. */
  ALLOW_NEW_ACCOUNTS: true,

  /*  regex restriction to apply to emails of new accounts requesting access 
      (only if automatic creation enabled) */
  // EMAIL_RESTRICTION:  /.+?@franksaulconstruction\.com$/gm,

  // name of this system
  SYSTEM_NAME: 'SPVATrack',

  PROMPT:"Consider the following json object. The output must be two description sections titled 'Proposal Includes' and 'Exclusions and assumptions' separated by a </br> tag. If an object has no selected materials, its name is listed in the 'Exclusions and assumptions' section; otherwise, a one-sentence description in the 'Proposal Includes' section that includes the name, coverage, and description. \n. Do not include extra symbols like (* or -)",

  
  // admin
  // inventory add/delete/ reorder options
  // inventory job associations menu (list of job_iventory items grouped and counted)
  // the update inventory item needs to make another query to inventory_job
  // if an item has been set to reorder when threshold is reached, use node mailer and the user defined email template. GENERATE EMAIL ONLY send text to gerry with item reorder request. if gerry approves, the email is sent if gerry declines, text: would you like to modify the order? if yes, modify order and loop if no, terminate 
  // option to change reorder email
  // option to change user data
  // the search Timesheet post request must pull inventory, and order email options
  // order email options:

  // change the email itself
  // change the confirmation process
  // now there is no confirmation process it just sends to big G and then he forwards it to the supplier
  // 
  // worker
  // the ability to add notes to the clockOut form


  // manager
  // the ability to add notes and INVENTORY CHANGES 
  // the updateInventory function has to have a lot of stuff email and twilio integration
  // 

  // general
  // if the user_type changes, the user must log out and back in again to update their local info. 
  // perhaps the check should use lookUpUser instead of req.user.local for user_type info since it can change. req.user.local only used for static user data like name, email
  // what google info can we pull?
  // does inventory data need another download button 
  // since inventory_job associates an inventory item to a job when a manager updates the value, should it also store the active task? 

}
