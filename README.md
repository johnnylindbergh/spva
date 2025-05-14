
# SPVA

SPVA is a Node.js-based web application designed to streamline project management, subcontractor coordination, invoicing, and payment tracking for service-oriented businesses. The system integrates with tools like QuickBooks and Stripe to provide a unified workflow from project initiation to payment completion.

## 🚀 Features

- 📋 **Project & Job Management**  
- 👷 **Subcontractor Assignment & Administration**  
- 💳 **Payment Tracking & History**  
- 🧾 **Invoice & Statement Generation (PDF support)**  
- 🔗 **QuickBooks Integration** for seamless financial operations  
- 🗄️ **Material & Cost Database Management**  

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL (SQL scripts provided)
- **Integrations:** QuickBooks API
- **PDF Generation:** Custom PDF utilities
- **Other:** Shell scripts for server management

## 📦 Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/spva.git
   cd spva
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   - Set up your environment variables (`.env` or config files) for database credentials, QuickBooks, server email, .
   - Example config files include `.greenlockrc` for SSL management.
   - Use Apache Virtual Host
   -  Use`certbot --apache` to request SSL certificates.

4. **Database Setup**
   - Import the SQL schemas:
     ```bash
     mysql -u your_user -p your_database < db.sql
     mysql -u your_user -p your_database < spvaUsers.sql
     mysql -u your_user -p your_database < materials.db.sql
     ```

5. **Start the Server**
   ```bash
   npm start
   ```
   Or use the provided script:
   ```bash
   ./startSPVAServer.sh
   ```
   Or even better, run the server as a service. 


## 🚨 Usage

- Access the web app via `http://localhost:PORT` 
- Use the admin panel to:
  - Manage jobs, subcontractors, and materials.
  - Generate invoices and statements.
  - Sync data with QuickBooks

Ensure API keys and tokens are properly configured before using integrations.

Create the credentials.js file 

```javascript


/*
  credentials.js: System credentials
*/

module.exports = {
  // openai credentials
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

  // company info for estimates and invoices and other documents
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",

  // email stuff

  serverEmail: "",
  emailPassword: "",

  stripe: {
    secret: ''
  },

  //  change 'sandbox' to 'production' after tests

  quickbooks : {
    consumerKey: '',
    consumerSecret: '',
    environment: 'sandbox',  
  },

  twilio: {
    accountSid: '',
    authToken: '',
    from: '' 
  },

  superAdmin: {
    name: '',
    email: '',
    phone_number: '',
  },

  subcontractorFormNotifiationRecipients: [
     {
      name: '',
      email: ''
    }
   
  ],

  subcontractorAgreementNotifiationRecipients:[

    {
      name: '',
      email: ''
    }

  ]
  
}

```




Consider adding crontabs to clean up generated pdfs. 

## 📂 Project Structure
```
spva/
├── server.js              # Main server entry point
├── routes.js              # API and app routes
├── auth.js                # Authentication middleware
├── subcontractor.js       # Subcontractor logic
├── quickbooks.js          # QuickBooks integration
├── pdf.js                 # PDF generation utilities
├── db.sql                 # Core database schema
├── test.js                # Test scripts
└── ...
```

## 📜 License

This project is licensed under the terms of the [MIT License](./LICENSE).
