initialize();

async function initialize() {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const sessionId = urlParams.get('session_id');
  const response = await fetch(`/session-status?session_id=${sessionId}`);
  const session = await response.json();

  if (session.status == 'open') {
     window.replace('/')
  } else if (session.status == 'complete') {
    document.getElementById('success').classList.remove('hidden'); // display the success message
    document.getElementById('customer-email').textContent = session.customer_email

    // // print the amount paid
    // console.log(session);
    // const amount = session.amount_total / 100;
    // console.log(amount);

    // // subtract 3% + 30 cents from the amount
    // const stripeFee = amount * 0.03 + 0.30;
    // const rawAmount = amount - stripeFee;
    // console.log("Raw Amount: " + rawAmount);

    // // push the session object to the server 

    // const response = await fetch('/sessionComplete', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: {session_id:sessionId, amount_paid: rawAmount}
    // });
  }
}