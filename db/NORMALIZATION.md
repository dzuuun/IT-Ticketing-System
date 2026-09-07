# Database normalization

Migration `007_normalized_relations.sql` introduces the normalized relational model without dropping operational data.

## Canonical relationships

- `users.department_id -> departments.id` is the canonical user-department relationship. Department names are returned through joins.
- `team_memberships(team_id, user_id)` is the canonical many-to-many staff-team relationship.
- `ticket_requestors.ticket_id -> tickets.id` stores the one-to-one requestor/contact snapshot for authenticated and guest submissions.
- `ticket_custom_field_values(ticket_id, field_key)` stores one submitted service-field value per row.
- `service_form_fields` and `service_form_field_options` replace catalog form-definition JSON with ordered relational rows.
- `ticket_assignments` remains the immutable assignment history, while the current assignee columns on `tickets` are cached workflow state.

## Transitional compatibility

The legacy `users.department_name`, `users.team_id`, ticket requestor columns, and `tickets.custom_fields` remain temporarily so an upgraded installation can roll forward without destructive data loss. API reads prefer the normalized relations, and new ticket/user writes populate normalized relations. `normalizeLegacyData.js` performs an idempotent backfill after migrations and optional seeding.

Once every deployed instance has run migration 007 and backups have been verified, a later maintenance migration may remove the deprecated columns.
