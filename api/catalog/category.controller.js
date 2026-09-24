const { query, getPool } = require("../../db/index");

const ALLOWED_FIELD_TYPES = new Set([
  "text",
  "email",
  "number",
  "date",
  "textarea",
  "select",
  "info",
]);

function normalizeFormSchema(schema) {
  if (!Array.isArray(schema)) return [];
  const seenKeys = new Set();

  return schema.map((field, index) => {
    const label = String(field.label || "").trim();
    let key = String(field.id || field.field_key || label)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 100);
    if (!label) throw new Error(`Field ${index + 1} needs a label.`);
    if (!key) key = `field_${index + 1}`;
    if (seenKeys.has(key)) throw new Error(`Field key "${key}" is duplicated.`);
    seenKeys.add(key);

    const type = ALLOWED_FIELD_TYPES.has(field.type) ? field.type : "text";
    const rawOptions = Array.isArray(field.options)
      ? field.options
      : String(field.options || "").split(/[\n,]/);
    const options =
      type === "select"
        ? [
            ...new Set(
              rawOptions
                .map((option) => String(option?.value || option || "").trim())
                .filter(Boolean),
            ),
          ]
        : [];
    if (type === "select" && options.length === 0)
      throw new Error(`Select field "${label}" needs at least one option.`);

    return {
      id: key,
      label: label.slice(0, 180),
      type,
      placeholder: String(field.placeholder || "")
        .trim()
        .slice(0, 255),
      required: type === "info" ? false : Boolean(field.required),
      options,
    };
  });
}

async function replaceFormSchema(connection, subcategoryId, rawSchema) {
  const schema = normalizeFormSchema(rawSchema);
  await connection.query(
    "DELETE FROM service_form_fields WHERE subcategory_id = ?",
    [subcategoryId],
  );

  for (const [fieldIndex, field] of schema.entries()) {
    const [result] = await connection.query(
      `INSERT INTO service_form_fields
       (subcategory_id, field_key, label, input_type, placeholder, is_required, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        subcategoryId,
        field.id,
        field.label,
        field.type,
        field.placeholder || null,
        field.required,
        fieldIndex,
      ],
    );
    for (const [optionIndex, option] of field.options.entries()) {
      await connection.query(
        `INSERT INTO service_form_field_options
         (field_id, option_value, option_label, display_order) VALUES (?, ?, ?, ?)`,
        [result.insertId, option, option, optionIndex],
      );
    }
  }

  // Keep the legacy snapshot synchronized during the compatibility period.
  await connection.query(
    "UPDATE subcategories SET form_schema = ? WHERE id = ?",
    [JSON.stringify(schema), subcategoryId],
  );
  return schema;
}

async function hydrateFormSchemas(subcategories) {
  const fields = await query(
    "SELECT * FROM service_form_fields WHERE is_active = 1 ORDER BY subcategory_id, display_order, id",
  );
  const options = await query(
    "SELECT * FROM service_form_field_options ORDER BY field_id, display_order, id",
  );
  return subcategories.map((subcategory) => {
    const normalizedFields = fields.filter(
      (field) => field.subcategory_id === subcategory.id,
    );
    if (normalizedFields.length === 0) return subcategory;
    return {
      ...subcategory,
      form_schema: normalizedFields.map((field) => ({
        id: field.field_key,
        label: field.label,
        type: field.input_type,
        placeholder: field.placeholder || undefined,
        required: Boolean(field.is_required),
        options: options
          .filter((option) => option.field_id === field.id)
          .map((option) => option.option_value),
      })),
    };
  });
}

async function getCategories(req, res) {
  try {
    const categories = await query(
      "SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC",
    );
    const subcategories = await hydrateFormSchemas(
      await query(
        "SELECT * FROM subcategories WHERE is_active = 1 ORDER BY name ASC",
      ),
    );

    const result = categories.map((cat) => {
      return {
        ...cat,
        subcategories: subcategories.filter(
          (sub) => sub.category_id === cat.id,
        ),
      };
    });

    return res.json({
      success: true,
      categories: result,
    });
  } catch (error) {
    console.error("[Get Categories Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch categories." });
  }
}

async function getAdminCategories(req, res) {
  try {
    const categories = await query(
      "SELECT * FROM categories ORDER BY name ASC",
    );
    const subcategories = await hydrateFormSchemas(
      await query("SELECT * FROM subcategories ORDER BY name ASC"),
    );
    return res.json({
      success: true,
      categories: categories.map((category) => ({
        ...category,
        subcategories: subcategories.filter(
          (item) => item.category_id === category.id,
        ),
      })),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch catalog." });
  }
}

async function createCategory(req, res) {
  try {
    const { name, description, icon } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required." });
    }

    const result = await query(
      "INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)",
      [name.trim(), description || null, icon || "help_outline"],
    );

    return res.status(201).json({
      success: true,
      message: "Category created.",
      categoryId: result.insertId,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to create category." });
  }
}

async function createSubcategory(req, res) {
  const connection = await getPool().getConnection();
  try {
    const {
      category_id,
      name,
      description,
      default_type,
      default_priority,
      form_schema = [],
    } = req.body;
    if (!category_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Category ID and subcategory name are required.",
      });
    }

    await connection.beginTransaction();
    const [result] = await connection.query(
      "INSERT INTO subcategories (category_id, name, description, default_type, default_priority) VALUES (?, ?, ?, ?, ?)",
      [
        category_id,
        name.trim(),
        description || null,
        default_type || "service_request",
        default_priority || "medium",
      ],
    );
    await replaceFormSchema(connection, result.insertId, form_schema);
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Subcategory created.",
      subcategoryId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    const validationError =
      error.message?.startsWith("Field ") ||
      error.message?.startsWith("Select field");
    return res.status(validationError ? 400 : 500).json({
      success: false,
      message: validationError
        ? error.message
        : "Failed to create subcategory.",
    });
  } finally {
    connection.release();
  }
}

async function updateCategory(req, res) {
  try {
    const { name, description, icon, is_active } = req.body;
    await query(
      "UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description), icon = COALESCE(?, icon), is_active = COALESCE(?, is_active) WHERE id = ?",
      [
        name?.trim() || null,
        description ?? null,
        icon?.trim() || null,
        is_active === undefined ? null : Boolean(is_active),
        req.params.categoryId,
      ],
    );
    return res.json({ success: true });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to update category." });
  }
}

async function updateSubcategory(req, res) {
  const connection = await getPool().getConnection();
  try {
    const {
      name,
      description,
      default_type,
      default_priority,
      is_active,
      form_schema,
    } = req.body;
    await connection.beginTransaction();
    await connection.query(
      "UPDATE subcategories SET name = COALESCE(?, name), description = COALESCE(?, description), default_type = COALESCE(?, default_type), default_priority = COALESCE(?, default_priority), is_active = COALESCE(?, is_active) WHERE id = ?",
      [
        name?.trim() || null,
        description ?? null,
        default_type || null,
        default_priority || null,
        is_active === undefined ? null : Boolean(is_active),
        req.params.subcategoryId,
      ],
    );
    if (form_schema !== undefined)
      await replaceFormSchema(
        connection,
        req.params.subcategoryId,
        form_schema,
      );
    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    const validationError =
      error.message?.startsWith("Field ") ||
      error.message?.startsWith("Select field");
    return res.status(validationError ? 400 : 500).json({
      success: false,
      message: validationError
        ? error.message
        : "Failed to update service item.",
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  getCategories,
  getAdminCategories,
  createCategory,
  createSubcategory,
  updateCategory,
  updateSubcategory,
};
