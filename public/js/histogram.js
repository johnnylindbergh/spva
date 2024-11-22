function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

httpGetAsync("/getTimesheet", function(cb) {
    var timesheet = JSON.parse(cb);
    const data = timesheet.map(function(value) {
    // Assuming 'value' has properties that can be used to calculate 'net', 'cogs', and 'gm'
    return {
      x: value.duration,
        y: moment(value.clock_in).format("YYYY-MM-DD")
        
    };
});
    console.log("data:", data);


    var ctx = document.getElementById('histogram').getContext('2d');
      const stackedLine = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
        scales: {
            y: {
                stacked: true
            }
        }
    }
});
});