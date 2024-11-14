
/*
  settings.js: System parameters
*/

module.exports = {

  // server port
  PORT: 8080,

  // is the system in development mode (explicit error messages, etc)
  DEV_MODE: true,

  // name of database
  DB_NAME: 'spvaTrack',

  // domain through which server is accessible
  DOMAIN: 'https://localhost',

  /*  does the system allow automatic creation of new user accounts
      when authentication is attempted. */
  ALLOW_NEW_ACCOUNTS: true,

  // project path used for uploads. No tailing slash
  PROJECT_PATH: '/Users/johnlindbergh/Documents/spva', 

  /*  regex restriction to apply to emails of new accounts requesting access 
      (only if automatic creation enabled) */
  // EMAIL_RESTRICTION:  /.+?@franksaulconstruction\.com$/gm,

  // name of this system
  SYSTEM_NAME: 'SPVATrack',

  PROMPT:"Consider the following json object. The output must be two description sections titled 'Proposal Includes' and 'Exclusions and assumptions' separated by a </br> tag. If an object has no selected materials, its name is listed in the 'Exclusions and assumptions' section; otherwise, a one-sentence description in the 'Proposal Includes' section that includes the name. \n. Do not include extra symbols like (* or -)",
 

}
