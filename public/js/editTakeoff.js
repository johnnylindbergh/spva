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

function updateTakeoffName() {
  // get the newname from the input field
  let name = $("#takeoff_name").val();
  console.log("Updating takeoff name: " + name);
  $.post("/update-takeoff-name", { takeoff_id: takeoff_id, name: name })
    .done(function() {
      console.log("Takeoff name updated: " + name);
    })
    .fail(function() {
      console.log("Failed to update takeoff name: " + name);
    });
}


function updateTakeoffOwnerName() {
  // get the newname from the input field
  let name = $("#takeoff_owner_name").val();
  console.log("Updating takeoff owner name: " + name);
  $.post("/update-takeoff-owner-name", { takeoff_id: takeoff_id, owner: name })
    .done(function() {
      console.log("Takeoff owner name updated: " + name);
    })
    .fail(function() {
      console.log("Failed to update takeoff owner name: " + name);
    });
}

function updateTakeoffBillingAddress() {
  // get the newname from the input field
  let address = $("#owner_billing_address").val();
  console.log("Updating takeoff owner name: " + name);
  $.post("/update-takeoff-owner-billing", { takeoff_id: takeoff_id, owner_billing_address: address })
    .done(function() {
      console.log("Takeoff owner name updated: " + name);
    })
    .fail(function() {
      console.log("Failed to update takeoff owner name: " + name);
    });
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

  if (subject_id && id){
      $.post("/remove-material-subject", { material_id: material_id, subject_id: subject_id })
        .done(function() {
        console.log("Material removed: " + material_id + " from subject: " + subject_id);
        loadTakeoffMaterials(takeoff_id); // Only reload the takeoff materials table
      })
      .fail(function() {
        console.log("Failed to remove material from subject: " + material_id);
      });
  }

}

function add_material_subject() {
  console.log("Adding material " + material_id + " to subject " + subject_id);

  if (material_id !== 0 && subject_id !== 0) {
    $.post("/add-material-subject", { material_id: material_id, subject_id: subject_id })
      .done(function() {
        console.log("Material added to subject: " + material_id + " " + subject_id);
        // wait 0.5 seconds and then call loadTakeoffMaterials
        setTimeout(function() {
          loadTakeoffMaterials(takeoff_id);
        }, 500);

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

           let checkbox = $("<input type='checkbox' onclick='toggleMaterial(" + row.id + ", this)'>");
        if (row.applied == 1) {
          checkbox.attr("checked", "checked");
        }
        newRow.append($("<td></td>").append(checkbox));

        newRow.append("<td style='width:15px;'>" + row.material_name + "</td>");

        let measurementInput = $("<input>")
          .attr("type", "number")
          .attr("value", row.measurement)
          .attr("min", "0")
          .attr("style", "width: 100px;")
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


        let laborPrice = $("<input type='number' id='labor_price' value='" + row.labor_cost + "' step='any' min='0' onchange='laborPriceChange(" + row.id + ")'> </br>");

        let laborCell = $("<td style='width:200px; float:left; '>Labor Cost $</td>").append(laborPrice);
        newRow.append(laborCell);

        measurementUnitInput.on("change", function() {
          let newMeasurementUnit = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurementUnit(rowId, newMeasurementUnit);
        });


     

        let materialsCell = $("<td></td>");
        let subsum = 0;
        
        if (row.applied != 0) {
          if (row.selected_materials && row.selected_materials.length > 0) {
           
            row.selected_materials.forEach((material) => {

              // remove material button
                     materialsCell.append("<i style = 'display:inline-block; padding:5px;'>" + material.name + " </i> ");

              let materialCell = $("<i class='fa fa-trash' onclick='removeMaterial(" + row.id + ", "+material.id+ ")'>");

                //material name
               // materialsCell.append("<br>");

              subsum += material.price * row.measurement;

              materialsCell.append(materialCell);
              if ( material.id == row.material_id) {
                let newCost = parseFloat(material.cost) + parseFloat(row.primary_cost_delta);
                  console.log(newCost);

                 let materialPrice = $("<input type='number' id='material_price_" + material.id + "' value='" + newCost.toString()+ "' step='any' min='0' onchange='priceChange(" + material.id + ")'> </br>");
                 materialPrice.addClass("material-price-input");

                 materialPrice.append("<input type='hidden' id='raw_material_price_" + material.id + "' value='" + material.cost + "'>");
                 materialsCell.append(materialPrice);

              }
              


            });


          }

          newRow.append(materialsCell);


        let addSubject = $("<input type='button' onclick='add_subject(" + row.id + ")'>");
        addSubject.attr("value", "Add Material");
        newRow.append(addSubject);

          sum += subsum;
        } else {
          newRow.append("<td>No Materials Applied</td>");
          newRow.attr("style", "background-color: #f2f2f2; opacity: 0.5;");
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
  
  let newPrice = parseFloat($("#raw_material_price_" + id).val());
  if (isNaN(newPrice) || newPrice < 0) {
    alert("Please enter a valid positive number for the price.");
    return;
  }

  // get original price
  let originalPrice = parseFloat($("#material_price_" + id).attr("value"));
// subtract the old price from the newPrice
  if (originalPrice == null) { console.log("could not get raw material price")}
    console.log(originalPrice);
  newPrice = newPrice - originalPrice;
  $.post("/change-material-price", { material_id: id, new_price: newPrice, takeoff_id: takeoff_id })
    .done(function() {
      console.log("Material price changed: " + id);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
      console.log("Failed to change material price: " + id);
    });
}



