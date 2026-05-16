<h1 align="center">
  <img src="https://img.shields.io/badge/Event%20Hub-College%20Event%20Management-6366f1?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Event Hub" />
</h1>

<p align="center">
  A full-stack college event management platform that connects students, clubs, and college administrations — built for the modern campus.
</p>

<p align="center">
  <a href="https://event-hub-8fe51.web.app" target="_blank">
    <img src="https://img.shields.io/badge/Live%20Demo-event--hub--8fe51.web.app-22c55e?style=flat-square&logo=firebase" />
  </a>
  <img src="https://img.shields.io/badge/Backend-Render-46b3e6?style=flat-square&logo=render" />
  <img src="https://img.shields.io/badge/Frontend-Firebase%20Hosting-f97316?style=flat-square&logo=firebase" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square&logo=postgresql" />
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
</p>

---

## 🎯 About the Project

**College Event Hub** is a multi-role web platform that streamlines the entire lifecycle of college events — from club creation and event publishing to student registration, team formation, and payment verification. It features four distinct role-based dashboards: **Platform Admin**, **College Admin**, **Club Coordinator**, and **Student**.

### ✨ Key Features

| Feature | Description |
|---|---|
| 🏛️ **Multi-College Support** | Each college has its own isolated admin dashboard and student pool |
| 🎪 **Event Management** | Create, publish, and manage events with full RSVP and team registration support |
| 👥 **Club Management** | Colleges can create clubs, assign coordinators, and track club activity |
| 🪪 **Role-Based Access** | 4-tier RBAC — Platform Admin, College Admin, Club Coordinator, Student |
| 🔐 **Firebase Auth** | Google Sign-In + email/password auth with JWT session management |
| 💳 **Payment Verification** | UPI-based payment flow with QR code upload and admin verification |
| 📊 **Analytics Dashboard** | Real-time stats on students, events, clubs, and registrations |
| 🔔 **Notifications** | In-app notification system for event offers, updates, and invites |
| 🤖 **AI Integration** | Google Gemini AI for smart event recommendations |
| ⏱️ **Real-time Firebase Sync** | Automatic 5-minute sync of Firebase Auth deletions/disables to the database |

---

## 🖥️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI Framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **React Router v6** | Client-side routing |
| **Firebase SDK** | Auth & hosting |
| **Axios** | HTTP client |
| **Recharts** | Analytics charts |
| **Framer Motion** | Animations |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| **Flask** | Web framework |
| **SQLAlchemy** | ORM |
| **PostgreSQL** | Primary database |
| **Firebase Admin SDK** | Server-side auth verification |
| **Flask-JWT-Extended** | JWT token management |
| **APScheduler** | Background jobs (event status sync, Firebase user sync) |
| **Cloudinary** | Image & file storage |
| **Flask-Limiter** | Rate limiting |
| **Gunicorn** | WSGI production server |
| **Google Gemini AI** | AI-powered features |

### Infrastructure
| Service | Purpose |
|---|---|
| **Firebase Hosting** | Frontend deployment |
| **Render** | Backend deployment |
| **Neon / Supabase** | Managed PostgreSQL |
| **Cloudinary** | Media CDN |

---

## 🗂️ Project Structure

```
college-event-hub/
├── backend/
│   ├── app.py                  # App factory, migrations, APScheduler
│   ├── models.py               # SQLAlchemy models (User, College, Club, Event…)
│   ├── config.py               # Environment configuration
│   ├── extensions.py           # db, bcrypt, limiter instances
│   ├── wsgi.py                 # Production entrypoint
│   ├── requirements.txt
│   ├── middleware/
│   │   └── auth_middleware.py  # JWT + role enforcement decorators
│   ├── routes/
│   │   ├── auth.py             # Login, register, Google OAuth, detect-college
│   │   ├── platform_admin.py   # Platform-wide user & college management
│   │   ├── college_admin.py    # College dashboard, clubs, events, students
│   │   ├── club_coordinator.py # Club events, registrations, activity log
│   │   ├── student.py          # Student profile, registrations, teams
│   │   ├── public.py           # Public event & college browsing
│   │   ├── registration.py     # Event registration flow
│   │   ├── team_registration.py# Team formation & payment
│   │   ├── notifications.py    # In-app notifications
│   │   ├── otp.py              # OTP email verification
│   │   └── telemetry.py        # Analytics & AI endpoints
│   └── utils/
│       ├── file_upload.py      # Cloudinary upload helpers
│       └── event_utils.py      # Event status auto-update logic
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Route definitions
│   │   ├── firebase.js         # Firebase SDK init
│   │   ├── pages/
│   │   │   ├── platform-admin/ # Platform Admin dashboard
│   │   │   ├── college-panel/  # College Admin dashboard
│   │   │   ├── club/           # Club Coordinator dashboard
│   │   │   ├── student/        # Student portal
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── components/         # Shared UI components
│   │   ├── context/            # Auth context & providers
│   │   ├── hooks/              # Custom React hooks
│   │   └── services/           # API service wrappers
│   └── firebase.json           # Firebase hosting config
│
├── wsgi.py                     # Root-level WSGI entrypoint (adds backend/ to path)
├── render.yaml                 # Render deployment config
└── requirements.txt            # Root-level requirements (for Render)
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL** database (local or cloud)
- **Firebase project** with Authentication enabled
- **Cloudinary** account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/prathamd24/Event-Hub.git
cd Event-Hub
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET_KEY=your-super-secret-key
FIREBASE_CREDENTIALS_PATH=./firebase-admin.json
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
PLATFORM_ADMIN_EMAIL=youremail@gmail.com
PLATFORM_ADMIN_PASSWORD=yourpassword
GEMINI_API_KEY=your-gemini-key
```

Place your Firebase service account JSON as `backend/firebase-admin.json`.

```bash
# Run the backend
python app.py
# or with gunicorn
gunicorn app:create_app --bind 0.0.0.0:5000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.development.example .env.development
```

Edit `.env.development`:
```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

```bash
# Start dev server
npm run dev
```

---

## 👤 Role Overview

| Role | Access |
|---|---|
| **Platform Admin** | Manage all colleges, view all users, system-wide analytics |
| **College Admin** | Manage college profile, clubs, events, students, registrations |
| **Club Coordinator** | Manage club events, team registrations, payment verification |
| **Student** | Browse & register for events, join teams, view profile |

---

## 🔄 Background Jobs (APScheduler)

The backend runs three automated background jobs every 5 minutes:

| Job | Interval | Description |
|---|---|---|
| `event_status_updater` | 5 min | Auto-updates event statuses (UPCOMING → ONGOING → COMPLETED) |
| `firebase_user_sync` | 5 min | Syncs Firebase Auth deletions/disables to the DB |
| `otp_cleanup` | 1 hour | Purges expired OTP records |

---

## 🌐 Deployment

### Backend (Render)

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn "app:create_app()" --bind 0.0.0.0:$PORT`
- **Root Directory:** `backend`
- **Python Version:** 3.11

### Frontend (Firebase Hosting)

```bash
cd frontend
npm run build
firebase deploy
```

---

## 📸 Screenshots

| Platform Admin | College Admin | Student Portal |
|---|---|---|
| User management, college approvals | Club & event management | Event browsing & registration |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is developed as an academic B.Tech project.

---

## 👨‍💻 Author

**Pratham Kumar** — [@prathamd24](https://github.com/prathamd24)

---

<p align="center">Made with ❤️ for the campus community</p>
