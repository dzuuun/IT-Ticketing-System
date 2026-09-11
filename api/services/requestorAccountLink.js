async function linkRequestsToAccount(execute, userId, email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!userId || !normalizedEmail) return;

  await execute(
    "UPDATE tickets SET requestor_user_id = ? WHERE requestor_user_id IS NULL AND LOWER(requestor_email) = ?",
    [userId, normalizedEmail],
  );
  await execute(
    "UPDATE ticket_requestors SET user_id = ? WHERE user_id IS NULL AND LOWER(email) = ?",
    [userId, normalizedEmail],
  );
}

module.exports = { linkRequestsToAccount };
