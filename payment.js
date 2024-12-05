// require credentials.js
const creds = require('./credentials');

//require database.js
const db = require('./database');

// This test secret API key is a placeholder. Don't include personal details in requests with this key.
// To see your test secret API key embedded in code samples, sign in to your Stripe account.
// You can also find your test secret API key at https://dashboard.stripe.com/test/apikeys.
const stripe = require('stripe')(creds.stripe.secret);


const YOUR_DOMAIN = creds.domain;



async function createCheckoutSession(hash, priceId) {
    // query the takeoffs table select *

    
    const session = await stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        line_items: [
            {
                // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                price: 'price_1JZV6bFabVokh3NdJ6TtPszR',
                quantity: 1,
            },
        ],
        mode: 'payment',
        return_url: `${YOUR_DOMAIN}/share/$(HASH))`,
    });

    return { clientSecret: session.client_secret };
}

async function getSessionStatus(sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
        status: session.status,
        customer_email: session.customer_details.email
    };
}

async function createPaymentIntent(takeoffd) {
    // query the takeoffs table select total to get the total price of the takeoff
    const takeoff = await db.query('SELECT total, owner_email FROM takeoffs WHERE id = ?', [takeoffId]);
    
    // null checking for the takeoff
        if (!takeoff) {
            throw new Error('Takeoff not found');
        }

    // create a payment intent with the total price
    const paymentIntent = await stripe.paymentIntents.create({
        amount: takeoff.total,
        currency: 'usd',
        payment_method_types: ['card'],
        receipt_email: takeoff.owner_email,
    });

    return { clientSecret: paymentIntent.client_secret };

}


module.exports = {
    createCheckoutSession,
    getSessionStatus,
    createPaymentIntent
};