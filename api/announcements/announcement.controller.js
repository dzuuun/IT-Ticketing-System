const { query } = require("../../db/index");

async function getAnnouncements(req, res) {
  try {
    const announcements = await query(
      "SELECT * FROM announcements WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY id DESC",
    );
    return res.json({ success: true, announcements });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch announcements." });
  }
}

async function createAnnouncement(req, res) {
  try {
    const { title, content, severity, expires_at, is_active = true } = req.body;
    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Title and content are required." });
    }

    const result = await query(
      "INSERT INTO announcements (title, content, severity, expires_at, is_active) VALUES (?, ?, ?, ?, ?)",
      [
        title.trim(),
        content.trim(),
        severity || "info",
        expires_at || null,
        is_active ? 1 : 0,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Announcement published.",
      id: result.insertId,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to create announcement." });
  }
}

async function getManagedAnnouncements(req, res) {
  try {
    const announcements = await query(
      "SELECT * FROM announcements ORDER BY created_at DESC, id DESC",
    );
    return res.json({ success: true, announcements });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch announcements." });
  }
}
async function updateAnnouncement(req, res) {
  try {
    const { title, content, severity, expires_at, is_active } = req.body;
    if (!title || !content)
      return res
        .status(400)
        .json({ success: false, message: "Title and content are required." });
    await query(
      "UPDATE announcements SET title = ?, content = ?, severity = ?, expires_at = ?, is_active = ? WHERE id = ?",
      [
        title.trim(),
        content.trim(),
        ["info", "warning", "urgent"].includes(severity) ? severity : "info",
        expires_at || null,
        is_active ? 1 : 0,
        req.params.announcementId,
      ],
    );
    return res.json({ success: true, message: "Announcement updated." });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Unable to update announcement." });
  }
}

module.exports = {
  getAnnouncements,
  createAnnouncement,
  getManagedAnnouncements,
  updateAnnouncement,
};
