const { query } = require('../../db/index');

async function getAnnouncements(req, res) {
  try {
    const announcements = await query(
      'SELECT * FROM announcements WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY id DESC'
    );
    return res.json({ success: true, announcements });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch announcements.' });
  }
}

async function createAnnouncement(req, res) {
  try {
    const { title, content, severity, expires_at } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const result = await query(
      'INSERT INTO announcements (title, content, severity, expires_at) VALUES (?, ?, ?, ?)',
      [title.trim(), content.trim(), severity || 'info', expires_at || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Announcement published.',
      id: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create announcement.' });
  }
}

module.exports = {
  getAnnouncements,
  createAnnouncement,
};

