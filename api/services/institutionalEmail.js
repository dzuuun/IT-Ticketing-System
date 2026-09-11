const INSTITUTIONAL_EMAIL_DOMAIN = "ndmu.edu.ph";

function isInstitutionalEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  return new RegExp(
    `^[^\\s@]+@${INSTITUTIONAL_EMAIL_DOMAIN.replace(".", "\\.")}$`,
  ).test(normalizedEmail);
}

module.exports = { INSTITUTIONAL_EMAIL_DOMAIN, isInstitutionalEmail };
