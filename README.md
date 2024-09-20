# fsc-track
A simple time tracking web application.

## Installation
1. Clone the repository: `git clone https://github.com/johnylindbergh/fsc-track.git`
2. Install Node 
3. Install the required packages: `npm install`
4. install mysql and run db.sql with `source db.sql`
5. Get google Oauth api key 
6. Create credentials.js of the form: 


```javascript
module.exports = {

  // Google OAuth2 credentials for user authentication
  GOOGLE_CLIENT_ID: '{your_google_client_id}',
  GOOGLE_CLIENT_SECRET: 'your_client_secret',

  // session encryption secret
  SESSION_SECRET: 'your_session_secret',

  // MySQL credentials
  MYSQL_USERNAME: 'your_mysql_username',
  MYSQL_PASSWORD: 'your_mysql_password',

  // ssl stuff
  approvedDomains: 'yourapproveddomain.com',
  domain: 'https://your_domain.coc',
  greenlockEmail:'your_greenlock_email',

  // email stuff

  serverEmail: "optional_server_email",
  emailPassword: "server_email_password"

}
```




## Usage
1. Navigate to the project directory: `cd fsc-track`
2. Run the application: `node server.js > logFileName.log &`
3. Open your web browser and visit `http://localhost:5000`


## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
