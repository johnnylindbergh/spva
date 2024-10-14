function createProgressBar(statusCode) {
  const statuses = [
    { code: 1, label: "Takeoff Uploaded" },
    { code: 2, label: "Estimate Generated" },
    { code: 3, label: "Estimate Published" },
    { code: 4, label: "Estimate Signed" }
  ];

  // Find the index of the current status
  let currentIndex = statuses.findIndex(s => s.code === statusCode);
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


function getTakeoffs() {
  console.log("retrieving takeoffs");
  // empty the table
  $("#takeoffs_table").empty();
  $.get("/getTakeoffs", function (data) {
    console.log(data);
    data.forEach(function (takeoff) {
      var row = $("<tr>");
      row.append("<td>" + takeoff.name + "</td>");

      // Create the form for editing
      var form = $("<form>");
      form.attr("action", "/editTakeoff");
      form.attr("method", "POST");

      var input = $("<input>");
      input.attr("type", "hidden");
      input.attr("name", "takeoff_id");
      input.attr("value", takeoff.id);

      var submit = $("<input>");
      submit.attr("type", "submit");
      submit.attr("value", "Edit");

      form.append(input);
      form.append(submit);

      var tdForm = $("<td>");
      tdForm.append(form);
      row.append(tdForm);

      // Format dates using Moment.js
      var createdAt = moment(takeoff.created_at).format('MMMM Do YYYY, h:mm:ss a');
      // var updatedAt = moment(takeoff.updated_at).format('MMMM Do YYYY, h:mm:ss a');

      row.append("<td>" + createdAt + "</td>");
      //row.append("<td>" + updatedAt + "</td>");

      // Add the 'View' column
      row.append("<td><a href='/takeoff/" + takeoff.id + "'>View</a></td>");

      // Create the progress bar cell AFTER the 'View' column
      var tdProgress = $("<td>");
      var progressBar = createProgressBar(takeoff.status);
      tdProgress.append(progressBar);
      row.append(tdProgress);

      $("#takeoffs_table").append(row);
    });
  });
}




getTakeoffs();
