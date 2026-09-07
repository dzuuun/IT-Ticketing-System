# NDMU MIS IT Ticketing System
### Notre Dame of Marbel University — Management Information Systems Service Desk

A modern, full-stack IT Ticketing & Service Desk application designed specifically for **NDMU MIS Operations**.

---

## 📁 Project Structure

```
IT-Ticketing-System/
├── api/                  # API Controllers, Routes, and Service Modules
├── auth/                 # Authentication, JWT, and RBAC Middleware
├── certificates/         # SSL/TLS & HTTPS Configuration Keys
├── client/               # React (Vite) + Tailwind CSS + Material Icons
├── db/                   # MySQL Connection Pool & Auto-Migrator
├── docs/                 # Operational Documentation & Guides
├── scripts/              # Database Seeder & Auto-Close Worker
├── uploads/              # Ticket File Attachments & Screenshots
├── .env                  # Environment Variables
├── .env.example          # Environment Variables Template
├── .gitignore            # Git Ignore Configuration
├── database.sql          # Complete MySQL DDL Schema
├── index.js              # Express Backend Server Entry
├── package.json          # Root Scripts & Backend Dependencies
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Requirements
- **Node.js**: v18+ (tested on Node v24)
- **MySQL**: 8.0+ running on `localhost:3306` (or configured via `.env`)

### 2. Setup Environment
Copy `.env.example` to `.env` (already created by default):
```bash
cp .env.example .env
```
Ensure your MySQL database credentials in `.env` match your local environment:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ndmu_ticketing
```

### 3. Database Initialization & Seeding
Run the seed script to automatically create database tables, NDMU colleges/departments, operational teams, dynamic service catalog items, knowledge base articles, and demo users:
```bash
npm run seed
```

### 4. Running the Application
You can run the backend and frontend concurrently or in separate terminals:

**Option A — All-in-One (Root):**
```bash
npm start
```
and in another terminal:
```bash
npm run client
```

- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/health`

---

## 👥 Default Demo Accounts

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ndmu.edu.ph` | `admin123` | MIS Director (Full access to all configurations & queues) |
| **Team Leader** | `lead.network@ndmu.edu.ph` | `lead123` | Network Team Lead (Triage & assignments) |
| **Technician 1** | `tech1@ndmu.edu.ph` | `tech123` | Network Specialist (Resolution & internal notes) |
| **Technician 2** | `tech2@ndmu.edu.ph` | `tech123` | Hardware & Systems Tech |
| **Faculty Requestor** | `faculty@ndmu.edu.ph` | `user123` | Prof. Juan Luna (CCS Faculty) |
| **Student Requestor** | `student@ndmu.edu.ph` | `user123` | Maria Clara (BSIT Student) |
| **Guest User** | *(No login required)* | — | Submit and track via reference code |

---

## 🌟 Key Features

1. **Three Tailored Interfaces**:
   - **Requestor Portal**: Landing page, dynamic Service Catalog form, My Requests dashboard, ticket timeline, resolution confirmation & star rating.
   - **MIS Staff Dashboard**: Queues (`New`, `Assigned`, `In Progress`, `Pending Requestor`, `Overdue`), claim tickets, triage modal, public replies vs private internal staff notes.
   - **Administrator Interface**: Service catalog manager, user roles (RBAC), team allocations, SLA policies, and reports.
2. **NDMU Dynamic Service Catalog**:
   - Distinct tailored fields for items (e.g. *Schoology Account* asks for handled subjects and faculty ID; *Wi-Fi Problem* asks for Building, Room, Device type, and SSID).
3. **Guest Submission & Tracking**:
   - Users who cannot sign in can submit tickets and track them using their ticket number (e.g. `MIS-2026-000124`) and tracking code.
4. **SLA Tracking & Auto-Close Engine**:
   - Priority-based SLA resolution countdowns with visual overdue alerts.
   - Automated background worker to auto-close resolved tickets after the configured period.