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
 // $("#selected_subject").text("Selected subject: " + material_name);
  document.getElementById("myDropdown").classList.toggle("show");
  // move div to mouse x,y
  // var x = event.clientX;
  // var y = event.clientY;
  // var div = document.getElementById("myDropdown");
  // div.style.top = y + 'px';
  // div.style.left = x + 'px';
  // console.log("x: " + x + " y: " + y);
  // console.log("div x: " + div.style.left + " div y: " + div.style.top);


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
    .done(function (data) {
      console.log("Takeoff materials loaded");
      $("#takeoff_materials_table").empty();
      let sum = 0;

      data.subjects.forEach((row) => {
        console.log(row);
        let newRow = $("<tr></tr>");

        // Checkbox for toggling material
        let checkbox = $("<input type='checkbox' onclick='toggleMaterial(" + row.id + ", this)'>");
        if (row.applied == 1) {
          checkbox.attr("checked", "checked");
        }
        newRow.append($("<td></td>").append(checkbox));


         // Checkbox for makeing material a separate line item
         let separateLineCheckbox = $("<input type='checkbox' onclick='separateLineItem(" + row.id + ", this)'>");
         if (row.separateLineItem == 1) {
          separateLineCheckbox.attr("checked", "checked");
         }
         newRow.append($("<td></td>").append(separateLineCheckbox));
 
        // Material name
        newRow.append("<td style='width:15px;'>" + row.material_name + "</td>");

        // Measurement input
        let measurementInput = $("<input>")
          .attr("type", "number")
          .attr("value", row.measurement)
          .attr("min", "0")
          .attr("style", "width: 100px;")
          .attr("step", "any")
          .data("row-id", row.id)
          .addClass("measurement-input");

        // Measurement unit selector
        let measurementUnits = ["Count", "sf", "ft' in\""];
        let measurementUnitInput = $("<select>")
          .data("row-id", row.id)
          .addClass("measurement-unit-input");

        measurementUnits.forEach(function (unit) {
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

        // Event handlers for measurement changes
        measurementInput.on("change", function () {
          let newMeasurement = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurement(rowId, newMeasurement);
          // Wait one sec and then reload the table to reflect changes
          setTimeout(function() {
            loadTakeoffMaterials(takeoff_id);
          }, 1000);
          
        });

        measurementUnitInput.on("change", function () {
          let newMeasurementUnit = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurementUnit(rowId, newMeasurementUnit);
          // Wait one sec and then reload the table to reflect changes
          setTimeout(function() {
            loadTakeoffMaterials(takeoff_id);
          }, 1000);
        });

        // Labor price input
        let laborPrice = $("<input type='number' id='labor_price_" + row.id + "' value='" + row.labor_cost + "' step='any' min='0' onchange='laborPriceChange(" + row.id + ")'>");
        let laborCell = $("<td style=' '>Labor Cost $</td>").append(laborPrice);
        newRow.append(laborCell);

        // Materials and cost calculation
        let materialsCell = $("<td></td>");
        let subsum = 0;

        if (row.applied != 0) {
          if (row.selected_materials && row.selected_materials.length > 0) {
            row.selected_materials.forEach((material) => {
              materialsCell.append("<i style='display:inline-block; padding:5px;'>" + material.name + " </i> ");
              let materialCell = $("<i class='fa fa-trash' onclick='removeMaterial(" + row.id + ", " + material.id + ")'>");
              materialsCell.append(materialCell);

              // Parse values and handle NaN
              let materialCost = parseFloat(material.cost) || 0;
              let measurement = parseFloat(row.measurement) || 0;
              let coverage = parseFloat(material.coverage) || 1; // Default to 1 to avoid division by zero
              console.log("Material cost: " + materialCost + " Measurement: " + measurement + " Coverage: " + coverage);
              let newCost = materialCost;

              // Adjust cost for primary, secondary, and tertiary materials
              if (material.id == row.material_id) {
                let primaryCostDelta = parseFloat(row.primary_cost_delta) || 0;
                newCost += primaryCostDelta;
                // if the cost delta is positive color the input red and if negative color it green
                let materialPrice = $("<input type='number' id='material_price_" + material.id + "' value='" + newCost.toFixed(2) + "' step='any' min='0' onchange='priceChange(" + material.id + ")'><br>");
                materialPrice.addClass("material-price-input");
                materialPrice.append("<input type='hidden' id='raw_material_price_" + material.id + "' value='" + material.cost + "'>");
                
                let delta = newCost - material.cost;
                if (delta > 0) {
                  materialPrice.css("color", "red");
                } else if (delta < 0) {
                  materialPrice.css("color", "green");
                }

                materialsCell.append(materialPrice);
               
              } else if (material.id == row.secondary_material_id) {
                let secondaryCostDelta = parseFloat(row.secondary_cost_delta) || 0;
                newCost += secondaryCostDelta;
                 
                let materialPrice = $("<input type='number' id='material_price_" + material.id + "' value='" + newCost.toFixed(2) + "' step='any' min='0' onchange='priceChange(" + material.id + ")'><br>");
                materialPrice.addClass("material-price-input");
                materialPrice.append("<input type='hidden' id='raw_material_price_" + material.id + "' value='" + material.cost + "'>");
                materialsCell.append(materialPrice);
              } else if (material.id == row.tertiary_material_id) {
                let tertiaryCostDelta = parseFloat(row.tertiary_cost_delta) || 0;
                newCost += tertiaryCostDelta;

                let materialPrice = $("<input type='number' id='material_price_" + material.id + "' value='" + newCost.toFixed(2) + "' step='any' min='0' onchange='priceChange(" + material.id + ")'><br>");
                materialPrice.addClass("material-price-input");
                materialPrice.append("<input type='hidden' id='raw_material_price_" + material.id + "' value='" + material.cost + "'>");
                materialsCell.append(materialPrice);
              }

              // Divide measurement by coverage and add to subsum
              let adjustedMeasurement = measurement;
              if (isNaN(adjustedMeasurement) || !isFinite(adjustedMeasurement)) {
                adjustedMeasurement = 0;
              }

              subsum += newCost * (adjustedMeasurement/material.coverage);

              if (row.labor_cost > 0) {
                  subsum += parseFloat(row.labor_cost) * adjustedMeasurement;
              }

              if (row.measurement_unit === "sf") {
                if(material.coverage <200){
                  material.coverage = 200;
                }
                subsum += (parseFloat(row.labor_cost) / parseFloat(material.coverage) * adjustedMeasurement);
              }

                if (row.measurement_unit === "ft' in\"") {
                  if(material.coverage <200){
                    material.coverage = 200;
                  }
                  subsum += (parseFloat(row.labor_cost) / parseFloat(material.coverage) * adjustedMeasurement);
                }

                if (row.measurement_unit === "Count") {
                  subsum += newCost * adjustedMeasurement;
                  subsum += parseFloat(row.labor_cost) * adjustedMeasurement;
                }
              
            });
          }

          newRow.append(materialsCell);

          // "Add Material" button
          let addSubject = $("<input type='button' onclick='add_subject(" + row.id + ")'>");
          addSubject.attr("value", "Add Material");
          newRow.append(addSubject);

          // Check for NaN in subsum before adding to sum
          if (isNaN(subsum) || !isFinite(subsum)) {
            console.log("subsum is NaN or Infinite");
            subsum = 0; // Reset subsum to 0 if invalid
          }
          sum += subsum;
        } else {
          newRow.append("<td>No Materials Applied</td>");
          newRow.attr("style", "background-color: #f2f2f2; opacity: 0.5;");
        }

        // Append subsum to the row
        newRow.append("<td>$" + subsum.toFixed(2) + "</td>");

        $("#takeoff_materials_table").append(newRow);
      });

      // Update total sum
      $("#sum").text("Total Cost: $" + numberWithCommas(sum.toFixed(2)));

      //now post the new sum to /updateTakeoffTotal
      $.post("/updateTakeoffTotal", { takeoff_id: takeoff_id, total: sum.toFixed(2) })
        .done(function () {
          console.log("Total updated for takeoff: " + takeoff_id);
        })
        .fail(function () {
          console.log("Failed to update total for takeoff: " + takeoff_id);
        });
        
    })
    .fail(function () {
      console.log("Failed to load takeoff materials");
    });
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

function updateTakeoffOwnerEmailAddress(){
  let email = $("#owner_email_address").val();
  console.log("Updating takeoff owner email address: " + email);
  $.post("/update-takeoff-owner-email", { takeoff_id: takeoff_id, owner_email_address: email })
    .done(function() {
      console.log("Takeoff owner email address updated: " + email);
    })
    .fail(function() {
      console.log("Failed to update takeoff owner email address: " + email);
    });
}

function laborPriceChange(id) {
  newPrice = $("#labor_price_"+id).val();
  

  $.post("/change-labor-price", { subject: id, price: newPrice })
    .done(function() {
      console.log("Price updated for material: " + id);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
      console.log("Failed to update price for material: " + id);
    });
  

}

function priceChange(id) {
  //this function doesent actually change the price of the material, it changes the price delta
  //so just get the newPrice and subtract it from the original price

  console.log("Price change for material " + id);

  let newPrice = $("#material_price_" + id).val();
  let rawPrice = $("#raw_material_price_" + id).val();

  let delta = newPrice - rawPrice;
  // color the input red if the delta is positive and green if negative
  if (delta > 0) {
    $("#material_price_" + id).css("color", "red");
  } else if (delta < 0) {
    $("#material_price_" + id).css("color", "green");
  } else {
    $("#material_price_" + id).css("color", "black");
  }
  

  console.log("New price: " + newPrice);

  $.post("/change-material-price", { material_id: id, delta: delta })
    .done(function(response) {
      console.log("Price updated for material: " + id);
      
       
    })
    .fail(function() {
      console.log("Failed to update price for material: " + id);
    });
  

    // wait 0.5 seconds and then call loadTakeoffMaterials
    setTimeout(function() {
      loadTakeoffMaterials(takeoff_id);
    }, 500);

}



// on document ready, get the takeoff id from the hidden input field
$(document).ready(function() {
  takeoff_id = $("#takeoff_id").val();
  console.log("Takeoff ID: " + takeoff_id);
  loadTakeoffMaterials(takeoff_id); // better

  

});