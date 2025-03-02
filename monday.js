const monday = require('monday-sdk-js');
const mondayClient = monday();




module.exports = (app, passport) => {
    app.get('/monday', (req, res) => {
        res.send('Monday!');
    });
}
