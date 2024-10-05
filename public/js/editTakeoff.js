
    function toggleMaterial(materialId, checkbox) {
      console.log("Material toggled: " + materialId.material);

      var isChecked = checkbox.checked ? 1 : 0;
      
      $.post("/toggle-material", { material_id: materialId, applied: isChecked })
        .done(function() {
          console.log("Material toggled: " + materialId);
        })
        .fail(function() {
          console.log("Failed to toggle material: " + materialId);
        });
    }


    var subject_id = 0;
    var material_id = 0;
    var takeoff_id = 0;
    /* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

function filterFunction() {
  var input, filter, ul, li, a, i;
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

function add_subject(id) {
  subject_id = id;
  console.log("Adding material for: " + subject_id);
  // use jquery to set the text of element selected_material to the name of the material
  $("#selected_subject").text("Selected subject: " + id);

}

function add_material(id){
  console.log("added material_id " + id + " for subject " + subject_id);
  material_id = id;
  //alert("added material_id " + id + " for subject " + subject_id);
  $("#selected_material").text("Selected material: " + id);
}

function add_material_subject(){
  // post subject_id and material_id
  console.log("adding material " + material_id + " to subject " + subject_id);

  if (material_id != 0 && subject_id != 0){
    $.post("/add-material-subject", {material_id: material_id, subject_id: subject_id})
      .done(function() {
        console.log("Material added to subject: " + material_id + " " + subject_id);
        material_id = 0;
        subject_id = 0;
        //call the loadTakeoffMaterials
        loadTakeoffMaterials(takeoff_id);
      })
      .fail(function() {
        console.log("Failed to add material to subject: " + material_id + " " + subject_id);
      });
  } else {
    console.log("Material or subject not selected");
  }

}



function loadTakeoffMaterials(id) {
  takeoff_id = id
  // this function posts {{takeoff_id}} to /loadTakeoffMaterials
  // and then loads the materials for the takeoff
  console.log("loading takeoff materials");
  $.post("/loadTakeoffMaterials", {takeoff_id: takeoff_id})
    .done(function(data) {
      console.log("Takeoff materials loaded");
      console.log(data);
      // load the data into the takeoff materials table
      // first, clear the table
      $("#takeoff_materials_table").empty();
      // data is of the form: {takeoff: takeoff, subjects:materials, materials:allMaterials, takeoff_id: req.body.takeoff_id}
      //print the materials and cost found in the subjects table

      var sum = 0;
      // rows in data.subjects are of the form:

      // applied: 1
      // id: 1
      // material_id: null
      // material_name: "Doors"
      // measurement: "31.00"
      // measurement_unit: "Count"
      // primary_cost_delta: null
      // primary_material: null
      // quartary_cost_delta: null
      // quaternary_material_id: null
      // secondary_cost_delta: null
      // secondary_material_id: null
      // tertiary_cost_delta: null
      // tertiary_material_id: null

      // for each row in data.subjects, add a row to the table
      for (var i = 0; i < data.subjects.length; i++){
        var row = data.subjects[i];
        // create a new row in the table
        var newRow = $("<tr></tr>");
        // add the material name to the row
        newRow.append("<td>" + row.material_name + "</td>");
        // add the measurement to the row
        newRow.append("<td>" + row.measurement + " " + row.measurement_unit + "</td>");
        // add the primary material to the row
        newRow.append("<td>" + row.primary_material + "</td>");
        // add the cost to the row
        newRow.append("<td>" + row.primary_cost_delta + "</td>");
        // add the checkbox to the row
        var checkbox = $("<input type='checkbox' onclick='toggleMaterial(" + row.material_id + ", this)'>");
        if (row.applied == 1){
          checkbox.attr("checked", "checked");
        }
        newRow.append($("<td></td>").append(checkbox));
        // add the row to the table
        $("#takeoff_materials_table").append(newRow);

        // add the cost to the sum
        var number_of gallons = ....row.measurement/row.selected_materials[0].coverage * (row.selected_materials[0].cost  + row.primary_cost_delta);
        sum += row.measurement * (row.selected_materials[0] + row.primary_cost_delta);
        sum += row.measurement * (row.selected_materials[0] + row.primary_cost_delta);
      }


      // print the sum to the console :
      console.log("sum of all materials: " + sum);



      // add the takeoff name
    })
    .fail(function() {
      console.log("Failed to load takeoff materials");
    });


}




