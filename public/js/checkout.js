// This test secret API key is a placeholder. Don't include personal details in requests with this key.
// To see your test secret API key embedded in code samples, sign in to your Stripe account.
// You can also find your test secret API key at https://dashboard.stripe.com/test/apikeys.
const stripe = Stripe("pk_live_51QJ7ovFabVokh3NdSmEYuzPqBjbFPe5tCZefifuWTE0t0HOkB1IX7SN7ujPcLRLsMVFC64jX4vbzRLiPOW1urJi40035RyTpwk");

initialize();

var takeoff_id = $('#takeoff_id').val();

// Create a Checkout Session
async function initialize() {
  const fetchClientSecret = async () => {
    const response = await fetch(`/create-checkout-session/` + takeoff_id, {
      method: "POST",
    });
    const { clientSecret } = await response.json();
    return clientSecret;
  };

  const checkout = await stripe.initEmbeddedCheckout({
    fetchClientSecret,
  });

  // Mount Checkout
  checkout.mount('#checkout');
}