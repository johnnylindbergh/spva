# spva-track
A simple business tracking application.

## Installation
1. Clone the repository: `git clone https://github.com/johnylindbergh/spva.git`
2. Install Node 
3. Install the required packages: `npm install`
4. install mysql and run db.sql with `source db.sql`
5. Get google Oauth api key 
6. Create credentials.js of the form: 


```javascript
/*
  credentials.js: System credentials
*/

const { environment } = require("intuit-oauth");

module.exports = {
  // openai credentiyals
  openai_api_key: '',
  // Google OAuth2 credentials for user authentication
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',

  // session encryption secret
  SESSION_SECRET: '',

  // MySQL credentials
  MYSQL_USERNAME: '',
  MYSQL_PASSWORD: '',

  // ssl stuff
  approvedDomains: '',
  domain: '',
  greenlockEmail:'',

  // email stuff

  serverEmail: "",
  emailPassword: "",

  stripe: {
    
    secret: ''
  },

  quickbooks : {
    consumerKey: '',
    consumerSecret: '',
    environment: 'sandbox',
    webhooksVerifier:''
  },

  monday: {
    token:''  
  }

}

```




## Usage
1. Navigate to the project directory: `cd spva`
2. Run the application: `node server.js > logFileName.log &`
3. Open your web browser and visit `http://localhost:5000`


## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
