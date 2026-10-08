# 📅 Event Management System

A simple, modern, and lightweight **Event Management System** built with **FastAPI**, **HTML5**, **CSS3**, and **Vanilla JavaScript**. 

This application features complete **Role-Based Access Control (RBAC)** for **Event Administrators** and **Attendees**, interactive competition enrollments, and instant automated **PDF Participation Certificate** generation.

---

## 🌟 Key Features

### 👑 Administrator Role
- **Event Management**: Create, edit, and delete events with date, time, venue, category, and descriptions.
- **Attendee Tracking**: View all registered attendees for any specific event or across all events.
- **Access Control**: Admin routes are secured against unauthorized access on both backend (`HTTP 403`) and frontend.
- **Certificate Issuance**: Download or generate participation certificates for any registered attendee.
- **Admin Dashboard**: View total events, upcoming schedules, total registrations, and quick management links.

### 👤 Attendee / Participant Role
- **Browse & Search Events**: Search events by name, venue, or category; filter by upcoming or completed status.
- **Interactive Competition Registration**: Enroll in events and choose competitions (Painting, Pencil Drawing, Singing, Dance, Quiz, Paper Presentation, Coding, or custom entry) using an in-page modal dialog.
- **Self-Service Dashboard**: Track registered events and upcoming enrollments.
- **Instant Certificate Download**: 1-click download of verified PDF certificates for attended events.

### 🎨 Modern UI & UX
- **Clean Design System**: Sleek typography, card elevations, badges, and responsive tables.
- **Non-blocking Toasts**: Modern feedback notifications instead of disruptive browser alerts.
- **Role Badges**: Prominent visual indicators (`👑 Admin` / `👤 Attendee`) in navbars and dashboards.
- **Zero Heavy Frontend Frameworks**: 100% vanilla HTML, CSS, and JS — lightning fast and easy to maintain.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Vanilla implementation with no Node/npm dependencies |
| **Backend** | Python 3.10+, FastAPI | High-performance asynchronous REST API framework |
| **Database** | SQLite, SQLAlchemy | Lightweight relational database with ORM mapping |
| **Server** | Uvicorn | ASGI web server implementation |
| **PDF Engine** | ReportLab | Programmatic generation of certificate documents |

---

## 📂 Project Directory Structure

```text
project/
├── main.py                 # FastAPI backend server, database models, and REST endpoints
├── app.js                  # Frontend client logic, role guards, modal controls, and API calls
├── style.css               # Unified modern design system stylesheet
├── test.db                 # SQLite database file
├── certificates/           # Directory where generated PDF certificates are stored
│
├── home.html               # Landing page with feature highlights and call-to-actions
├── login.html              # User and Administrator login page
├── register.html           # User registration page with Role selector (Attendee vs Admin)
├── dashboard.html          # Dynamic dashboard tailored to user role (Admin vs Attendee)
├── events.html             # Events directory with search, filters, and registration actions
├── add_event.html          # Form to create new events (Admin only)
├── edit_event.html         # Form to modify existing event details (Admin only)
├── delete_event.html       # Confirmation page to delete events (Admin only)
├── registered_users.html   # Table of attendees enrolled in a specific event (Admin only)
├── interested_events.html  # All registrations overview (Admin) / My registrations (Attendee)
├── about.html              # Project overview, purpose, and technology information
├── logout.html             # Session logout confirmation page
└── user.html               # Seamless redirect helper to dashboard
```

---

## 🔒 Roles & Permissions Matrix

| Feature / Action | Attendee (`user`) | Administrator (`admin`) |
| :--- | :---: | :---: |
| Browse & Search Events | ✅ | ✅ |
| Register for Competitions | ✅ | — |
| View "My Registered Events" | ✅ | — |
| Download Own Certificate | ✅ | ✅ |
| Create New Events | ❌ | ✅ |
| Edit / Update Events | ❌ | ✅ |
| Delete Events | ❌ | ✅ |
| View Other Attendees / All Registrations | ❌ | ✅ |
| Generate Certificate for Any Participant | ❌ | ✅ |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have **Python 3.10 or higher** installed.

### 2. Setup Virtual Environment
Open PowerShell or your terminal in the project directory:

```powershell
# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment on Windows
.\.venv\Scripts\Activate.ps1
```

### 3. Install Required Dependencies
```powershell
pip install fastapi uvicorn sqlalchemy reportlab
```

### 4. Run the Application
Start the FastAPI server using Uvicorn:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

### 5. Access the Web Application
Open your web browser and navigate to:
```text
http://127.0.0.1:8000
```

---

## 🧪 Testing User Roles

### Testing as an Attendee:
1. Navigate to **Register** (`/register.html`).
2. Fill in your details and select **"👤 Attendee / Participant"** as the role.
3. Sign in to view your **Attendee Dashboard**.
4. Go to **Events** (`/events.html`), find an event, and click **Register**.
5. Select a competition (e.g. *Coding*, *Dance*, *Quiz*) from the modal dialog and confirm.
6. Return to your dashboard or the registrations page to download your **PDF Participation Certificate**.
7. Try opening `/add_event.html` directly in the address bar — the application will automatically deny access and redirect you safely.

### Testing as an Administrator:
1. Navigate to **Register** (`/register.html`).
2. Fill in your details and select **"👑 Event Administrator"** as the role.
3. Sign in to view the **Admin Dashboard** with system statistics.
4. Click **+ Add Event** to schedule a new event.
5. In **Events**, view attendee registrations, modify event information, or delete outdated events.

---

## 📡 API Endpoints Reference

### 🔐 Authentication & Users
- `POST /api/register` — Create a new user (`name`, `email`, `password`, `role`).
- `POST /api/login` — Authenticate user and retrieve role (`email`, `password`).
- `GET /api/me?email={email}` — Get user profile and role details.
- `GET /api/user/registrations?user_email={email}` — Fetch registrations for the logged-in attendee.

### 📅 Events Management
- `GET /api/events` — Retrieve all events ordered by date and time.
- `GET /api/events/{id}` — Retrieve details of a specific event.
- `POST /api/events?admin_email={email}` — Create a new event *(Admin only)*.
- `PUT /api/events/{id}?admin_email={email}` — Update event details *(Admin only)*.
- `DELETE /api/events/{id}?admin_email={email}` — Delete an event *(Admin only)*.

### 📝 Registrations & Competitions
- `POST /api/events/{id}/register?user_email={email}&competition={comp}` — Register for an event and select a competition.
- `GET /api/events/{id}/user-status?user_email={email}` — Check if a user is registered for an event.
- `GET /api/events/{id}/registrations?admin_email={email}` — List attendees for an event *(Admin only)*.
- `GET /api/interested-events?admin_email={email}` — List all registrations across all events *(Admin only)*.

### 📜 Certificate Generation
- `GET /api/events/{id}/certificate?user_email={email}&requester_email={email}` — Generate and stream an official A4 Participation Certificate in PDF format.
  - *Allowed if `requester_email == user_email` (attendee self-download) OR if requester has the `admin` role.*

---

## 📄 License & Notes
This project is developed as a hobby and educational project. Feel free to customize and expand it!
