# NDMU MIS IT Ticketing System - Documentation

## Overview

The NDMU MIS IT Ticketing System is a custom Service Desk application engineered specifically for the operational workflows of the Notre Dame of Marbel University Management Information Systems (MIS) Department.

## Architecture

- **Backend**: Node.js & Express API with MySQL 8.x (`mysql2/promise`)
- **Frontend**: React 18 (Vite) + Tailwind CSS + Material Icons & Lucide Icons
- **Security**: JWT Authentication, bcrypt password hashing, RBAC (`admin`, `team_leader`, `technician`, `requestor`)
- **Storage**: Ticket attachment uploads in `uploads/`

## Role Hierarchies

1. **Requestor**: Students, Faculty, and Staff. Create service requests/incidents, track status, add comments, upload attachments, confirm resolution.
2. **Technician**: View assigned/team tickets, update statuses, record troubleshooting actions, add internal notes, resolve tickets.
3. **Team Leader**: All technician capabilities + assign/reassign tickets, view team performance reports.
4. **Administrator**: Full system management (Users, Technicians, Categories, Service Catalog dynamic forms, SLA rules, Audit logs).
