module.exports = {
            getTakeoff: `SELECT
          applied_materials.id AS id,
          applied_materials.material_id AS material_id,
          applied_materials.applied AS applied,
          materials.name AS primary_material,
          applied_materials.name  AS material_name,
          applied_materials.secondary_material_id AS secondary_material_id,
          applied_materials.tertiary_material_id AS tertiary_material_id,
          applied_materials.quartary_material_id AS quaternary_material_id,
          applied_materials.primary_cost_delta AS primary_cost_delta,
          applied_materials.secondary_cost_delta AS secondary_cost_delta,
          applied_materials.tertiary_cost_delta AS tertiary_cost_delta,
          applied_materials.quartary_cost_delta AS quartary_cost_delta,
          applied_materials.measurement AS measurement,
          applied_materials.measurement_unit AS measurement_unit
        FROM
          applied_materials
        LEFT JOIN
          materials ON applied_materials.material_id = materials.id
        WHERE
          applied_materials.takeoff_id = ?;`
}