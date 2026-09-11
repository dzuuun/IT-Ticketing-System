const { query } = require("../../db");
const STATUSES = new Set([
  "available",
  "assigned",
  "in_maintenance",
  "retired",
  "lost",
]);
const MAINTENANCE_TYPES = new Set([
  "inspection",
  "preventive",
  "repair",
  "upgrade",
  "other",
]);
const nullable = (value) => String(value ?? "").trim() || null;

async function getAssets(req, res) {
  try {
    const assets =
      await query(`SELECT a.*, ac.name AS category_name, d.name AS department_name, al.name AS location_name, mt.name AS maintenance_template_name,
      (SELECT MAX(aml.performed_at) FROM asset_maintenance_logs aml WHERE aml.asset_id = a.id) AS last_maintenance_at,
      (SELECT MIN(aml.next_due_date) FROM asset_maintenance_logs aml WHERE aml.asset_id = a.id AND aml.next_due_date >= CURDATE()) AS next_maintenance_due
      FROM assets a LEFT JOIN asset_categories ac ON ac.id = a.category_id LEFT JOIN locations d ON d.id = a.department_id LEFT JOIN locations al ON al.id = a.location_id LEFT JOIN asset_maintenance_templates mt ON mt.id = a.maintenance_template_id
      ORDER BY a.is_active DESC, a.updated_at DESC, a.name ASC`);
    return res.json({ success: true, assets });
  } catch (error) {
    console.error("[Get Assets Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load assets." });
  }
}

async function getAsset(req, res) {
  try {
    const [asset] = await query(
      `SELECT a.*, ac.name AS category_name, d.name AS department_name, al.name AS location_name, mt.name AS maintenance_template_name
      FROM assets a LEFT JOIN asset_categories ac ON ac.id = a.category_id LEFT JOIN locations d ON d.id = a.department_id LEFT JOIN locations al ON al.id = a.location_id LEFT JOIN asset_maintenance_templates mt ON mt.id = a.maintenance_template_id WHERE a.id = ?`,
      [req.params.assetId],
    );
    if (!asset)
      return res
        .status(404)
        .json({ success: false, message: "Asset not found." });
    const maintenanceLogs = await query(
      `SELECT aml.*, performed.full_name AS performed_by_name, created.full_name AS created_by_name
      FROM asset_maintenance_logs aml LEFT JOIN users performed ON performed.id = aml.performed_by_user_id
      LEFT JOIN users created ON created.id = aml.created_by_user_id WHERE aml.asset_id = ? ORDER BY aml.performed_at DESC, aml.id DESC`,
      [asset.id],
    );
    if (maintenanceLogs.length) {
      const placeholders = maintenanceLogs.map(() => "?").join(", ");
      const activities = await query(
        `SELECT * FROM asset_maintenance_activities WHERE maintenance_log_id IN (${placeholders}) ORDER BY display_order, id`,
        maintenanceLogs.map((log) => log.id),
      );
      const activityMap = new Map();
      activities.forEach((activity) => {
        const values = activityMap.get(activity.maintenance_log_id) || [];
        values.push(activity);
        activityMap.set(activity.maintenance_log_id, values);
      });
      maintenanceLogs.forEach((log) => {
        log.activities = activityMap.get(log.id) || [];
      });
    }
    return res.json({
      success: true,
      asset,
      maintenance_logs: maintenanceLogs,
    });
  } catch (error) {
    console.error("[Get Asset Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load the asset." });
  }
}

function normalizeAsset(body) {
  return {
    asset_tag: nullable(body.asset_tag)?.toUpperCase(),
    name: nullable(body.name),
    category_id: body.category_id || null,
    brand: nullable(body.brand),
    model: nullable(body.model),
    serial_number: nullable(body.serial_number),
    status: nullable(body.status) || "available",
    department_id: body.department_id || null,
    location_id: body.location_id || null,
    maintenance_template_id: body.maintenance_template_id || null,
    purchase_date: nullable(body.purchase_date),
    warranty_end: nullable(body.warranty_end),
    notes: nullable(body.notes),
    is_active:
      !["retired", "lost"].includes(nullable(body.status) || "available") &&
      body.is_active !== false &&
      body.is_active !== 0,
  };
}
async function assertCategory(categoryId) {
  const [category] = await query(
    "SELECT id FROM asset_categories WHERE id = ? AND is_active = 1",
    [categoryId],
  );
  return category;
}
async function assertMaintenanceTemplate(templateId) {
  const [template] = await query(
    "SELECT id FROM asset_maintenance_templates WHERE id = ?",
    [templateId],
  );
  return template;
}
async function saveAsset(req, res, isUpdate) {
  try {
    const asset = normalizeAsset(req.body || {});
    if (!asset.asset_tag || !asset.name || !asset.category_id)
      return res.status(400).json({
        success: false,
        message: "Asset tag, asset name, and category are required.",
      });
    if (!STATUSES.has(asset.status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid asset status." });
    if (!(await assertCategory(asset.category_id)))
      return res
        .status(400)
        .json({ success: false, message: "Select an active asset category." });
    if (
      asset.maintenance_template_id &&
      !(await assertMaintenanceTemplate(asset.maintenance_template_id))
    )
      return res.status(400).json({
        success: false,
        message: "Select a valid maintenance template.",
      });
    const values = Object.values(asset);
    const result = isUpdate
      ? await query(
          `UPDATE assets SET asset_tag=?, name=?, category_id=?, brand=?, model=?, serial_number=?, status=?, department_id=?, location_id=?, maintenance_template_id=?, purchase_date=?, warranty_end=?, notes=?, is_active=? WHERE id=?`,
          [...values, req.params.assetId],
        )
      : await query(
          `INSERT INTO assets (asset_tag,name,category_id,brand,model,serial_number,status,department_id,location_id,maintenance_template_id,purchase_date,warranty_end,notes,is_active,created_by_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [...values, req.user.id],
        );
    if (isUpdate && !result.affectedRows)
      return res
        .status(404)
        .json({ success: false, message: "Asset not found." });
    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      id: result.insertId,
      message: isUpdate
        ? "Asset updated successfully."
        : "Asset created successfully.",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({
        success: false,
        message: "Asset tag or serial number already exists.",
      });
    console.error("[Save Asset Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to save asset." });
  }
}
const createAsset = (req, res) => saveAsset(req, res, false);
const updateAsset = (req, res) => saveAsset(req, res, true);

async function getCategories(req, res) {
  try {
    const categories = await query(
      "SELECT * FROM asset_categories WHERE is_active = 1 ORDER BY name ASC",
    );
    return res.json({ success: true, categories });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Unable to load asset categories." });
  }
}
async function createCategory(req, res) {
  try {
    const name = nullable(req.body?.name);
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Category name is required." });
    const result = await query(
      "INSERT INTO asset_categories (name) VALUES (?)",
      [name],
    );
    return res.status(201).json({
      success: true,
      category: { id: result.insertId, name, is_active: 1 },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({
        success: false,
        message: "That asset category already exists.",
      });
    return res
      .status(500)
      .json({ success: false, message: "Unable to create asset category." });
  }
}
async function getLocations(req, res) {
  try {
    const locations = await query(
      "SELECT * FROM locations WHERE is_active = 1 ORDER BY name ASC",
    );
    return res.json({ success: true, locations });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Unable to load asset locations." });
  }
}
async function getManagedLocations(req, res) {
  try {
    const locations = await query(
      "SELECT * FROM locations ORDER BY is_active DESC, name ASC",
    );
    return res.json({ success: true, locations });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load locations." });
  }
}
async function createLocation(req, res) {
  try {
    const name = nullable(req.body?.name);
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Location name is required." });
    const result = await query(
      "INSERT INTO locations (name, code, type) VALUES (?, NULL, 'other')",
      [name],
    );
    return res.status(201).json({
      success: true,
      location: { id: result.insertId, name, is_active: 1 },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({
        success: false,
        message: "That asset location already exists.",
      });
    return res
      .status(500)
      .json({ success: false, message: "Unable to create asset location." });
  }
}
async function updateLocation(req, res) {
  try {
    const name = nullable(req.body?.name);
    const isActive = req.body?.is_active;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Location name is required." });
    const result = await query(
      "UPDATE locations SET name = ?, is_active = ? WHERE id = ?",
      [name, isActive === false || isActive === 0 ? 0 : 1, req.params.locationId],
    );
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: "Location not found." });
    return res.json({ success: true, message: "Location updated successfully." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({ success: false, message: "That location already exists." });
    return res.status(500).json({ success: false, message: "Unable to update location." });
  }
}

async function getMaintenanceTemplates(req, res) {
  try {
    const templates = await query(
      `SELECT mt.*, ac.name AS category_name
       FROM asset_maintenance_templates mt
       LEFT JOIN asset_categories ac ON ac.id = mt.category_id
       ORDER BY mt.is_active DESC, mt.name ASC`,
    );
    if (templates.length) {
      const activities = await query(
        `SELECT * FROM asset_maintenance_template_activities
         WHERE template_id IN (${templates.map(() => "?").join(", ")})
         ORDER BY display_order, id`,
        templates.map((template) => template.id),
      );
      const byTemplate = new Map();
      activities.forEach((activity) => {
        const values = byTemplate.get(activity.template_id) || [];
        values.push(activity);
        byTemplate.set(activity.template_id, values);
      });
      templates.forEach((template) => {
        template.activities = byTemplate.get(template.id) || [];
      });
    }
    return res.json({ success: true, templates });
  } catch (error) {
    console.error("[Get Maintenance Templates Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load maintenance templates.",
    });
  }
}

function normalizeTemplateActivities(activities) {
  if (!Array.isArray(activities)) return [];
  return activities
    .map((activity) => nullable(activity?.activity_text || activity))
    .filter(Boolean)
    .slice(0, 100);
}

async function saveMaintenanceTemplate(req, res, isUpdate) {
  try {
    const name = nullable(req.body?.name);
    const description = nullable(req.body?.description);
    const categoryId = req.body?.category_id || null;
    const isActive = req.body?.is_active !== false && req.body?.is_active !== 0;
    const activities = normalizeTemplateActivities(req.body?.activities);
    if (!name || !activities.length) {
      return res.status(400).json({
        success: false,
        message: "A template name and at least one activity are required.",
      });
    }
    if (categoryId && !(await assertCategory(categoryId))) {
      return res.status(400).json({
        success: false,
        message: "Select an active asset category.",
      });
    }
    let templateId = req.params.templateId;
    if (isUpdate) {
      const result = await query(
        "UPDATE asset_maintenance_templates SET name = ?, category_id = ?, description = ?, is_active = ? WHERE id = ?",
        [name, categoryId, description, isActive ? 1 : 0, templateId],
      );
      if (!result.affectedRows)
        return res
          .status(404)
          .json({ success: false, message: "Template not found." });
      await query(
        "DELETE FROM asset_maintenance_template_activities WHERE template_id = ?",
        [templateId],
      );
    } else {
      const result = await query(
        "INSERT INTO asset_maintenance_templates (name, category_id, description, is_active, created_by_user_id) VALUES (?, ?, ?, ?, ?)",
        [name, categoryId, description, isActive ? 1 : 0, req.user.id],
      );
      templateId = result.insertId;
    }
    for (const [index, activityText] of activities.entries()) {
      await query(
        "INSERT INTO asset_maintenance_template_activities (template_id, activity_text, display_order) VALUES (?, ?, ?)",
        [templateId, activityText, index],
      );
    }
    return res
      .status(isUpdate ? 200 : 201)
      .json({ success: true, id: templateId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({
        success: false,
        message: "That template name already exists.",
      });
    console.error("[Save Maintenance Template Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save maintenance template.",
    });
  }
}
const createMaintenanceTemplate = (req, res) =>
  saveMaintenanceTemplate(req, res, false);
const updateMaintenanceTemplate = (req, res) =>
  saveMaintenanceTemplate(req, res, true);

async function addMaintenanceLog(req, res) {
  try {
    const {
      maintenance_type,
      academic_year,
      maintenance_frequency,
      maintenance_template_id,
      description,
      performed_at,
      performed_by_user_id,
      cost,
      next_due_date,
      activities = [],
    } = req.body || {};
    if (!description?.trim() || !performed_at)
      return res.status(400).json({
        success: false,
        message: "Maintenance date and description are required.",
      });
    if (!MAINTENANCE_TYPES.has(maintenance_type || "inspection"))
      return res
        .status(400)
        .json({ success: false, message: "Invalid maintenance type." });
    const [asset] = await query("SELECT id FROM assets WHERE id = ?", [
      req.params.assetId,
    ]);
    if (!asset)
      return res
        .status(404)
        .json({ success: false, message: "Asset not found." });
    if (
      maintenance_template_id &&
      !(await assertMaintenanceTemplate(maintenance_template_id))
    )
      return res.status(400).json({
        success: false,
        message: "Select a valid maintenance template.",
      });
    const result = await query(
      "INSERT INTO asset_maintenance_logs (asset_id,maintenance_type,academic_year,maintenance_frequency,maintenance_template_id,description,performed_at,performed_by_user_id,cost,next_due_date,created_by_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [
        req.params.assetId,
        maintenance_type || "inspection",
        nullable(academic_year),
        nullable(maintenance_frequency),
        maintenance_template_id || null,
        description.trim(),
        performed_at,
        performed_by_user_id || null,
        cost || null,
        next_due_date || null,
        req.user.id,
      ],
    );
    if (Array.isArray(activities)) {
      for (const [index, activity] of activities.entries()) {
        const text = nullable(activity?.activity_text);
        if (!text) continue;
        await query(
          "INSERT INTO asset_maintenance_activities (maintenance_log_id, activity_text, is_completed, remarks, display_order) VALUES (?, ?, ?, ?, ?)",
          [
            result.insertId,
            text,
            activity.is_completed ? 1 : 0,
            nullable(activity.remarks),
            index,
          ],
        );
      }
    }
    return res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    console.error("[Add Asset Maintenance Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to add maintenance log." });
  }
}
module.exports = {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  addMaintenanceLog,
  getCategories,
  createCategory,
  getLocations,
  getManagedLocations,
  createLocation,
  updateLocation,
  getMaintenanceTemplates,
  createMaintenanceTemplate,
  updateMaintenanceTemplate,
};
