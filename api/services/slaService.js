const { query } = require("../../db/index");

async function calculateSlaDeadlines(priority) {
  const now = new Date();

  let responseHours = 8;
  let resolutionHours = 24;

  switch ((priority || "").toLowerCase()) {
    case "critical":
      responseHours = 1;
      resolutionHours = 4;
      break;
    case "urgent":
      responseHours = 2;
      resolutionHours = 8;
      break;
    case "high":
      responseHours = 4;
      resolutionHours = 12;
      break;
    case "medium":
      responseHours = 8;
      resolutionHours = 24;
      break;
    case "low":
      responseHours = 24;
      resolutionHours = 72;
      break;
    default:
      responseHours = 8;
      resolutionHours = 24;
  }

  try {
    const settings = await query(
      "SELECT setting_key, setting_value FROM system_settings",
    );
    const map = {};
    settings.forEach((s) => (map[s.setting_key] = s.setting_value));

    if (priority === "critical" && map.sla_critical_hours) {
      resolutionHours = parseInt(map.sla_critical_hours, 10);
    } else if (priority === "high" && map.sla_high_hours) {
      resolutionHours = parseInt(map.sla_high_hours, 10);
    } else if (priority === "medium" && map.sla_medium_hours) {
      resolutionHours = parseInt(map.sla_medium_hours, 10);
    } else if (priority === "low" && map.sla_low_hours) {
      resolutionHours = parseInt(map.sla_low_hours, 10);
    }
  } catch (err) {
    // Keep fallback
  }

  const dueResponse = new Date(now.getTime() + responseHours * 3600 * 1000);
  const dueResolution = new Date(now.getTime() + resolutionHours * 3600 * 1000);

  return { dueResponse, dueResolution, responseHours, resolutionHours };
}

module.exports = { calculateSlaDeadlines };
