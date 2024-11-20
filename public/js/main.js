$(document).ready(function () {
  function createProgressBar(statusCode) {
    const statuses = [
      { code: 1, label: "Takeoff Uploaded" },
      { code: 2, label: "Estimate Generated" },
      { code: 3, label: "Estimate Published" },
      { code: 4, label: "Estimate Signed" },
    ];

    // Find the index of the current status
    let currentIndex = statuses.findIndex((s) => s.code === statusCode);
    if (currentIndex === -1) {
      currentIndex = 0; // Default to the first status if not found
    }

    // Create the progress bar container
    const progressBar = $("<div>").addClass("progress-bar");

    // Create each segment of the progress bar
    statuses.forEach((stage, index) => {
      const segment = $("<div>").addClass("progress-segment");
      segment.text(stage.label);

      if (index <= currentIndex) {
        segment.addClass("completed");
      }

      progressBar.append(segment);
    });

    return progressBar;
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
  
    // Fetch takeoff data from the server
    $.get("/getTakeoffs", function (data) {
      console.log(data);
  
      data.forEach(function (takeoff) {
        let row = $("<tr>");
        row.append(`<td>${takeoff.name}</td>`);
  
        // Create the 'Edit' form
        let editForm = $("<form>", {
          action: "/editTakeoff", // Edit URL
          method: "POST",        // POST request
        });
        editForm.append(
          $("<input>", { type: "hidden", name: "takeoff_id", value: takeoff.id }),
          $("<input>", { type: "submit", value: "Edit" })
        );
        row.append($("<td>").append(editForm));
  
        // Format and display the creation date
        let createdAt = new Date(takeoff.created_at).toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        });
        row.append(`<td>${createdAt}</td>`);
  
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
        let progressBar = createProgressBar(takeoff.status);
        let tdProgress = $("<td>");
        if (takeoff.status === 4) {
          tdProgress.addClass("hoverable").attr(
            "title",
            `Estimate Signed: ${new Date(takeoff.signed_at).toLocaleString("en-US")}`
          );
        } else if (takeoff.status > 3) {
          progressBar.addClass("hoverable").attr(
            "title",
            `View Count: ${takeoff.view_count}`
          );
        }
        tdProgress.append(progressBar);
        row.append(tdProgress);
  
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
