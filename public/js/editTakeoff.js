let subject_id = 0;
let material_id = 0;
let takeoff_id = 0;

function toggleMaterial(materialId, checkbox) {
  console.log("Material toggled: " + materialId);

  let isChecked = checkbox.checked ? 1 : 0;
  
  $.post("/toggle-material", { material_id: materialId})
    .done(function() {
      console.log("Material toggled successfully: " + materialId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
      console.log("Failed to toggle material: " + materialId);
    });
}

function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

function filterFunction() {
  let input, filter, div, a, i, txtValue;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  div = document.getElementById("myDropdown");
  a = div.getElementsByTagName("a");
  for (i = 0; i < a.length; i++) {
    txtValue = a[i].textContent || a[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = "";
    } else {
      a[i].style.display = "none";
    }
  }
}

function add_subject(id, material_name) {
  subject_id = id;
  console.log("Adding material for subject: " + material_name);
  $("#selected_subject").text("Selected subject: " + material_name);
  document.getElementById("myDropdown").classList.toggle("show");
}

function add_material(id) {
  console.log("Added material_id " + id + " for subject " + subject_id);
  material_id = id;
  document.getElementById("myDropdown").classList.toggle("show");

  if (material_id != null && subject_id != null) {
    add_material_subject();
  }
}

function removeMaterial(subject_id, id) {
  material_id = id;

  $.post("/remove-material-subject", { material_id: material_id, subject_id: subject_id })
    .done(function() {
      console.log("Material removed: " + material_id + " from subject: " + subject_id);
      loadTakeoffMaterials(takeoff_id); // Only reload the takeoff materials table
    })
    .fail(function() {
      console.log("Failed to remove material from subject: " + material_id);
    });
}

function add_material_subject() {
  console.log("Adding material " + material_id + " to subject " + subject_id);

  if (material_id !== 0 && subject_id !== 0) {
    $.post("/add-material-subject", { material_id: material_id, subject_id: subject_id })
      .done(function() {
        console.log("Material added to subject: " + material_id + " " + subject_id);
        loadTakeoffMaterials(takeoff_id); // Only reload the takeoff materials table
      })
      .fail(function() {
        console.log("Failed to add material to subject: " + material_id);
      });
  } else {
    console.log("Material or subject not selected");
    alert("Please select both a material and a subject before adding.");
  }
}

function loadTakeoffMaterials(id) {
  takeoff_id = id;
  console.log("Loading takeoff materials");
  
  $.post("/loadTakeoffMaterials", { takeoff_id: takeoff_id })
    .done(function(data) {
      console.log("Takeoff materials loaded");
      $("#takeoff_materials_table").empty();
      let sum = 0;

      data.subjects.forEach((row) => {
        console.log(row)
        let newRow = $("<tr></tr>");
        newRow.append("<td>" + row.material_name + "</td>");

        let measurementInput = $("<input>")
          .attr("type", "number")
          .attr("value", row.measurement)
          .attr("min", "0")
          .attr("step", "any")
          .data("row-id", row.id)
          .addClass("measurement-input");

        let measurementUnits = ["Count", "sf", "ft' in\""];
        let measurementUnitInput = $("<select>")
          .data("row-id", row.id)
          .addClass("measurement-unit-input");

        measurementUnits.forEach(function(unit) {
          let option = $("<option>").attr("value", unit).text(unit);
          if (unit === row.measurement_unit) {
            option.attr("selected", "selected");
          }
          measurementUnitInput.append(option);
        });

        let measurementCell = $("<td></td>")
          .append(measurementInput)
          .append(" ")
          .append(measurementUnitInput);

        newRow.append(measurementCell);

        measurementInput.on("change", function() {
          let newMeasurement = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurement(rowId, newMeasurement);
        });

        measurementUnitInput.on("change", function() {
          let newMeasurementUnit = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurementUnit(rowId, newMeasurementUnit);
        });

        newRow.append("<td>" + row.primary_cost_delta + "</td>");

        let checkbox = $("<input type='checkbox' onclick='toggleMaterial(" + row.id + ", this)'>");
        if (row.applied == 1) {
          checkbox.attr("checked", "checked");
        }
        newRow.append($("<td></td>").append(checkbox));


         let materialsCell = $("<td></td>");
        let subsum = 0;
        if (row.applied != 0) {
          if (row.selected_materials && row.selected_materials.length > 0) {
           
            row.selected_materials.forEach((material) => {

              // remove material button
                              materialsCell.append("<br><i>" + material.name + " </i> ");

              let materialCell = $("<i class='fa fa-trash' onclick='removeMaterial(" + row.id + ", "+material.id+ ")'>");

                //material name
               // materialsCell.append("<br>");

              subsum += material.price * row.measurement;

              materialsCell.append(materialCell);

            });


          }

          newRow.append(materialsCell);


        let addSubject = $("<input type='button' onclick='add_subject(" + row.id + ")'>");
        addSubject.attr("value", "Add Material");
        newRow.append(addSubject);

          sum += subsum;
        } else {
          newRow.append("<td>No Materials Applied</td>");
        }

        $("#takeoff_materials_table").append(newRow);


      });
      // for row end
    })
    .fail(function() {
      console.log("Failed to load takeoff materials");
    });
}

function updateMeasurement(rowId, newMeasurement) {
  $.post("/update-measurement", { id: rowId, measurement: newMeasurement })
    .done(function() {
      console.log("Measurement updated for subject: " + rowId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
      console.log("Failed to update measurement for subject: " + rowId);
    });
}

function updateMeasurementUnit(rowId, newUnit) {
  console.log("Updating measurement unit for subject: " + rowId + " to: " + newUnit);
  
  $.post("/update-measurement-unit", { id: rowId, unit: newUnit })
    .done(function() {
      console.log("Measurement unit updated successfully for subject: " + rowId);
      loadTakeoffMaterials(takeoff_id); // Reload the materials to reflect changes
    })
    .fail(function() {
      console.log("Failed to update measurement unit for subject: " + rowId);
     // alert("Failed to update the measurement unit. Please try again.");
    });
}

function priceChange(id) {
  console.log("Price change for material " + id);
  
  let newPrice = parseFloat($("#material_price_" + id).val());
  if (isNaN(newPrice) || newPrice < 0) {
    alert("Please enter a valid positive number for the price.");
    return;
  }

  $.post("/change-material-price", { material_id: id, new_price: newPrice })
    .done(function() {
      console.log("Material price changed: " + id);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
      console.log("Failed to change material price: " + id);
    });
}

function generateEstimate() {
  console.log("Generating estimate");

  $.post("/generate-estimate", { takeoff_id: takeoff_id })
    .done(function() {
      console.log("Estimate generated");
      window.location.href = "/estimates";
    })
    .fail(function() {
      console.log("Failed to generate estimate");
    });
}


