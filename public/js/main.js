// const { name } = require("ejs");

$(document).ready(function () {




    //  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    //         // If the user prefers dark mode, add the class
        
    //         // If the user prefers light mode, remove the class
       
    //         $('table').addClass('table-dark table-striped');
    //         $('th').addClass('table-dark');
    //         $('td').addClass('table-dark');
    //         $('tr').addClass('table-dark');

        
    //         $('td').css('background-color', '#142a30');
    //         $('th').css('background-color', '#343a40');
    //         $('tr').css('background-color', '#343a40');
    //         $('th').css('color', 'gray');
    //         $('td').css('color', 'gray');
    //         $('tr').css('color', 'gray');
    //         $('table').css('background-color', '#343a40');
    //         $('table').css('color', 'gray');
    //         $('table').css('border', '1px solid white');
    //         $('table').css('border-radius', '5px');
    //         $('table').css('border-collapse', 'collapse');
    //         $('table').css('width', '100%');
    //         $('table').css('overflow', 'scroll');
    //         $('table').css('padding', '6%');
    //         $('table').css('margin', 'auto');
    //         $('table').css('margin-top', '20px');
    //         $('table').css('margin-bottom', '20px');
    //         $('table').css('border-radius', '5px');
    //         $('table').css('border-collapse', 'collapse');
    //         $('table').css('overflow', 'scroll');
    //         $('table').css('padding', '6%');
    //         $('table').css('margin', 'auto');
    //         $('table').css('margin-top', '20px');
    //         $('table').css('margin-bottom', '20px');

    //         $('body').css('background-color', '#343a40');

    //         $('container').css('background-color', '#343a40');
         

    //  }
    

  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function createStatusIndicator(statusCode, dateCreated) {
    const statuses = [
      { code: 0, label: "Takeoff Created", color: "rgba(255, 235, 59, 0.36)" }, // vibrant yellow
      { code: 1, label: "Takeoff Uploaded", color: "rgba(255, 152, 0, 0.36)" }, // vibrant orange
      { code: 2, label: "Estimate Generated", color: "rgba(33, 150, 243, 0.36)" }, // light blue
      { code: 3, label: "Estimate Published", color: "rgba(3, 169, 244, 0.36)" }, // vibrant blue
      { code: 4, label: "Estimate Approved", color: "rgba(60, 198, 65, 0.36)" }, // vibrant green
      { code: 5, label: "Invoiced", color: "rgba(76, 175, 80, 0.36)" },
    ];

    const status = statuses.find((s) => s.code === statusCode);
    if (!status) {
      console.error("Invalid status code:", statusCode);
      return;
    }



    const indicator = document.createElement("div");

    // Set the text content and attributes
    indicator.textContent = status.label;
    indicator.setAttribute("data-status", status.code);

    // set the color based on the status

    // use bootstrap color
     indicator.style.backgroundColor = status.color;

    // use bootstrap callout 
    indicator.className = "alert alert-info";
    // indicator.style.width = "100px";
     indicator.style.padding = "8px";
    indicator.style.textAlign = "center";
    indicator.style.alignItems = "center";
    indicator.style.display = "flex";

    indicator.paddingTop = "50px";
    indicator.marginTop = "10px";

    // push down the indicator to the bottom of the cell
    indicator.style.height = "40px";

    // nudge the indicator down
    indicator.style.marginTop = "14px";

    return indicator;
  }


   

  function viewPaymentHistory(id) {
    // Send a POST request to viewPaymentHistory with takeoff_id
    $.post("/viewPaymentHistory", { takeoff_id: id }, function (data) {
      // Handle successful response (e.g., display data or navigate)
      console.log("Payment history loaded:", data);
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error("Error viewing payment history:", textStatus, errorThrown);
    });
  }

  function getTakeoffs() {
    console.log("Retrieving takeoffs...");
    // Clear the table
    $("#takeoffs_table").empty();

    // add headers
    let headers = $("<tr>");
    headers.append($("<th>").text("Name"));
    headers.append($("<th>").text("Client"));
    headers.append($("<th>").text(" "));
    headers.append($("<th>").text(" "));
    headers.append($("<th>").text("Status"));
    headers.append($("<th>").text("Total Invoiced"));
    headers.append($("<th>").text("Signed Total"));
    headers.append($("<th>").text("Base Cost"));
    // headers.append($("<th>").text("Total"));

    $("#takeoffs_table").append(headers);
  
    // Fetch takeoff data from the server
    $.get("/getTakeoffs", function (data) {
      console.log(data);
  
      data.forEach(function (takeoff) {
        let row = $("<tr>");
        
        let nameCell  = $("<td>").text(takeoff.name);
        nameCell.css("width", "160px");


        // show the date when you hoever over the name
        nameCell.attr("title", moment(takeoff.takeoff_created_at).format("YYYY-MM-DD HH:mm:ss"));


        row.append(nameCell);

        let clientCell = $("<td>").text(takeoff.givenName);
        clientCell.css("width", "160px");
        row.append(clientCell);
        
        let editForm;
  
        if (!takeoff.isAlTakeoff) {
          // Create the 'Edit' form
          editForm = $("<form>", {
            action: "/editTakeoff", // Edit URL
            method: "POST",        // POST request
          });

        } else if (takeoff.isAlTakeoff){
          editForm = $("<form>", {
            action: "/generateEstimate", // Edit URL
            method: "POST",        // POST request
          });
        }
          
        editForm.append(
          $("<input>", { type: "hidden", name: "takeoff_id", value: takeoff.id }),
          $("<input>", { type: "submit", value: "Edit" })
        );
        row.append($("<td>").append(editForm));
  
        // Format and display the creation date
    

  
        // Create the 'View' form, similar to 'Edit'
        let viewForm = $("<form>", {
          action: "/viewPaymentHistory", // View URL
          method: "POST",                // POST request
        });
        viewForm.append(
          $("<input>", { type: "hidden", name: "takeoff_id", value: takeoff.id }),
          $("<input>", { type: "submit", value: "View" }) // Submit button
        );
        row.append($("<td>").append(viewForm));
  
        // Add the progress bar
        let status = createStatusIndicator(takeoff.status, takeoff.takeoff_created_at);
        let tdProgress = $("<td>");
        if (takeoff.status === 4) {
          tdProgress.addClass("hoverable").attr(
            "title",
            `Estimate Signed: ${new Date(takeoff.signed_at).toLocaleString("en-US")}`
          );
        } else if (takeoff.status > 3) {
         
        }
        tdProgress.append(status);
        row.append(tdProgress);

        // add amout due
        row.append($("<td>").text("$"+ numberWithCommas(parseFloat(takeoff.total_due).toFixed(2))));


        if (takeoff.signed_total == null) {
          takeoff.signed_total = 0;
        }
        
        row.append($("<td>").text("$"+ numberWithCommas(parseFloat(takeoff.signed_total).toFixed(2))));
        row.append($("<td>").text("$"+ numberWithCommas(parseFloat(takeoff.total).toFixed(2))));
  
        // Append the row to the table
        $("#takeoffs_table").append(row);
      });
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error("Error retrieving takeoffs:", textStatus, errorThrown);
    });
  }
  
  

  // Initialize the takeoffs table
  getTakeoffs();
});
