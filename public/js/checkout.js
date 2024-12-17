// This test secret API key is a placeholder. Don't include personal details in requests with this key.
// To see your test secret API key embedded in code samples, sign in to your Stripe account.
// You can also find your test secret API key at https://dashboard.stripe.com/test/apikeys.
const stripe = Stripe("pk_live_51QPlTGCZjwfDAQxHGU5uqgmvGFct78jJ3B5cTNGbYwTY9EhCSFwqsdOUYhxj6SEbaktVME1121IFjzgLyjIKNflB00R1ixu4Xv");

$(document).ready(function() {
  initialize();
});

var takeoff_id = $('#takeoff_id').val();

// Create a Checkout Session
async function initialize() {
  const fetchClientSecret = async () => {
    const response = await fetch(`/create-checkout-session/` + takeoff_id, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ takeoff_id: takeoff_id }),
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