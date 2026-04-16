# Class Dashboard

A role-based classroom management system for Iowa State University's Senior Design (COM S 309) program. Built with Spring Boot (backend) and React Native/Expo (frontend).

## Quick Start

### Local Development

**Backend:**
```bash
cd Backend
# Create .env file with database credentials (see Environment Variables section)
./mvnw spring-boot:run
```

**Frontend (web):**
```bash
cd frontend
npm install
npm run web         # Metro bundler on port 8081
```

**Frontend (mobile):**
```bash
npm start           # Expo dev server — scan QR code for iOS/Android
```

**Frontend (Electron desktop):**
```bash
npm run web           # Terminal 1 — start Expo web dev server
npm run electron:dev  # Terminal 2 — launch desktop app
```

### Deployment (VM: coms-4020-006.class.las.iastate.edu)

The frontend is built locally (Node 18+ required) and copied into Spring Boot's static resources folder. Spring Boot serves both the API and the frontend on **port 8080**.

**First-time setup on the server:**
```bash
ssh gbulle@coms-4020-006.class.las.iastate.edu
cd ~/ug_mk_4

git fetch origin
git reset --hard origin/main

# Create .env if it doesn't exist (gitignored)
cat > Backend/.env << 'EOF'
SPRING_DATASOURCE_URL=jdbc:postgresql://coms-4020-006.class.las.iastate.edu:5432/class_dashboard
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SERVER_PORT=8080
JWT_SECRET=Pu5XofXF6IEnT0ud+uLJ2rfe96Wyr/OWRoIp7F8A8PM
GOOGLE_CLIENT_ID=124195890479-kh157q1foah7sc96ckjbvdvrdt9esu0q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
FRONTEND_URL=http://coms-4020-006.class.las.iastate.edu:8080
EOF
```

**Deploy (run on your local machine after every frontend change):**
```bash
# 1. Build the frontend locally (requires Node 18+)
cd frontend
npm run build:web

# 2. Copy the build output to the server's static folder
scp -r dist/* gbulle@coms-4020-006.class.las.iastate.edu:/home/gbulle/ug_mk_4/Backend/src/main/resources/static/

# 3. On the server — pull latest backend changes and restart
ssh gbulle@coms-4020-006.class.las.iastate.edu
cd ~/ug_mk_4
git pull
pkill -f "dashboard309" 2>/dev/null; sleep 1
cd Backend
nohup ./mvnw spring-boot:run > backend.log 2>&1 &
tail -f backend.log   # wait for "Started Dashboard309Application"
```

The site is accessible at **http://coms-4020-006.class.las.iastate.edu:8080** (campus network / VPN required).

> **Note:** The class server only exposes port 8080 externally. The frontend build must be done locally because the server runs Node.js 16, which is too old for Expo's build tools (Node 18+ required). The built `dist/` files are gitignored — they live only on the server.

## Features

- **Role-Based Access Control** — Student, TA, HTA, Instructor with granular permissions
- **JWT Authentication** — Token-based login + cookie-based refresh; Google OAuth support
- **Team Management** — View, search, filter teams; edit name, repo URL, TA notes, status
- **Member Roles** — Assign Frontend / Backend / Full Stack project role per member
- **Attendance Tracking** — Record per-student lecture and TA meeting attendance (Present/Late/Absent) with calendar UI; per-tab counts
- **Weekly Performance** — Grade students weekly on code and teamwork (Poor/Moderate/Good) with week-picker; persisted per student per week
- **Demo Performance** — Grade students across 4 demos on code and teamwork; persisted per student per demo
- **At-Risk Students** — Automatically flags students based on: lecture absences (warning ≥3, critical ≥5), habitual lateness (≥3), poor demo performance (2+ demos), poor weekly performance (3+ weeks)
- **Task Assignment** — Create, assign, edit, and delete tasks for teams/students; due dates; edit in-place
- **File Import** — Upload CSV/Excel to bulk-import class roster and team data
- **TA Management** — Invite and manage TAs (Instructor only)
- **Discord Integration** — Per-team Discord link; clickable button on team view
- **Cross-Platform** — Web, iOS, Android, and Electron desktop app

## Role Permissions

| Feature | Student | TA | HTA | Instructor |
|---|---|---|---|---|
| View teams | Own only | Assigned | All | All |
| Edit team info / repo | ✗ | ✓ | ✓ | ✓ |
| Record attendance | ✗ | ✓ | ✓ | ✓ |
| Grade weekly/demo performance | ✗ | ✓ | ✓ | ✓ |
| View at-risk students | ✗ | ✓ | ✓ | ✓ |
| Assign tasks | ✗ | ✓ | ✓ | ✓ |
| Upload class roster | ✗ | ✗ | ✓ | ✓ |
| Manage TAs | ✗ | ✗ | ✗ | ✓ |

## Test Users

```
Instructor:  netid=instructor  password=instructor
HTA:         netid=hta         password=hta
TA:          netid=ta          password=ta
Student:     netid=student     password=student

Test students (24 accounts across 6 teams, password: Password123!):
  student1–student4   → Team A1
  student5–student8   → Team A2
  student9–student12  → Team A3
  student13–student16 → Team B1
  student17–student20 → Team B2
  student21–student24 → Team B3
```

## Tech Stack

**Backend:** Java 17, Spring Boot 3.2.3, Spring Security + JWT (JJWT 0.11.5), PostgreSQL (`ddl-auto: update`), Maven

**Frontend:** React Native 0.81.5, Expo 54, TypeScript, NativeWind/TailwindCSS, Axios, React Navigation 7, Electron 28

## API Endpoints

**Auth** (`/api/auth`)
- `POST /login` — password login, returns `{ accessToken, refreshToken }`
- `POST /login/google` — Google OAuth login, returns `{ accessToken, refreshToken }`
- `POST /refresh` — body: `{ refreshToken }`, returns `{ accessToken, refreshToken }`
- `POST /logout` — body: `{ refreshToken }`

**Users** (`/api/users`)
- `GET /self` — current user
- `GET /` — list users (filterable)
- `POST /`, `PUT /{id}`, `DELETE /{id}`
- `PUT /{id}/project-role` — set Frontend/Backend/Full Stack role

**Teams** (`/api/teams`)
- `GET /` — list teams (filter by taNetid, section, status)
- `GET /{id}`, `PUT /{id}`
- `GET /{id}/students`, `PUT /{id}/add/{studentId}`, `PUT /{id}/remove/{studentId}`

**Tasks** (`/api/tasks`)
- `GET /assigned-to/{netid}`, `GET /assigned-by/{netid}`
- `POST /`, `PUT /{id}`, `DELETE /{id}`

**Attendance** (`/api/attendance`)
- `GET /student/{netid}` — all records for a student
- `POST /` — create (upserts by student + date + type)
- `PUT /{id}`, `DELETE /{id}`

**Weekly Performance** (`/api/weekly-performance`)
- `GET /student/{netid}` — all weekly records for a student
- `POST /` — create/upsert by (studentNetid, weekStartDate)
- `PUT /{id}`, `DELETE /{id}`

**Demo Performance** (`/api/demo-performance`)
- `GET /student/{netid}` — all demo records for a student
- `POST /` — create/upsert by (studentNetid, demoNumber)
- `PUT /{id}`, `DELETE /{id}`

**Import** (`/api/import`)
- `POST /` — upload CSV/Excel to bulk-import roster/teams

**Docs**
- `GET /swagger-ui/**` — Swagger UI
- `GET /v3/api-docs` — OpenAPI spec

## Environment Variables

### Backend (`.env` in `Backend/` — gitignored)

```
SPRING_DATASOURCE_URL=jdbc:postgresql://{host}:{port}/class_dashboard
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SERVER_PORT=8080
JWT_SECRET={base64-encoded-256-bit-secret}
GOOGLE_CLIENT_ID={from Google Cloud Console}
GOOGLE_CLIENT_SECRET={from Google Cloud Console}
FRONTEND_URL=http://localhost:8081
```

**Google OAuth setup (one-time):** Add to Authorized Redirect URIs in Google Cloud Console:
- `http://localhost:8080/login/oauth2/code/google`
- `http://coms-4020-006.class.las.iastate.edu:8080/login/oauth2/code/google`

### Frontend (`.env.local` in `frontend/` — gitignored, optional)

By default the app points to the VM backend. Override for local dev:

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080   # Android emulator
# EXPO_PUBLIC_API_URL=http://localhost:8080  # iOS simulator / web
```

After changing, restart Metro with `npx expo start --clear`.

## Project Structure

```
ug_mk_4/
├── Backend/
│   ├── src/main/java/edu/iastate/dashboard309/
│   │   ├── controller/     # REST endpoints (Auth, Users, Teams, Tasks,
│   │   │                   #   Attendance, WeeklyPerformance, DemoPerformance,
│   │   │                   #   Import, Comments, Roles, Permissions)
│   │   ├── service/        # Business logic
│   │   ├── model/          # JPA entities
│   │   ├── repository/     # Spring Data JPA repos
│   │   ├── dto/            # Request/response records
│   │   └── authentication/ # SecurityConfig, JwtFilter, JwtService
│   ├── src/main/resources/application.yml
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── api/            # client.ts, attendance.ts, demoPerformance.ts,
│   │   │                   # weeklyPerformance.ts, tasks.ts, teams.ts, users.ts
│   │   ├── components/     # TeamCard, MemberAttendance, WeeklyPerformance,
│   │   │                   # TeamProgress, AtRiskStudentCard, ProfileAvatar, ...
│   │   ├── screens/        # DashboardScreen, TeamsScreen, TeamDetail,
│   │   │                   # TeamMemberDetail, AtRiskStudentsScreen,
│   │   │                   # TaskAssignmentScreen, UploadScreen, TAManager, ...
│   │   ├── types/          # Teams.ts, shared type definitions
│   │   └── utils/auth.ts   # Role/permission helpers
│   ├── electron/main.js    # Electron main process
│   ├── App.tsx             # Root navigation + auth state
│   └── package.json
└── README.md
```

## Frontend Scripts

```bash
npm run web             # Web (port 8081)
npm start               # Expo dev server (iOS/Android/Web)
npm run electron:dev    # Desktop (requires npm run web first)
npm run electron:build  # Build distributable (Windows/macOS/Linux)
npm run lint
npm run type-check
```

## Troubleshooting

**Backend won't start**
- Verify `Backend/.env` exists with all required variables
- Check port 8080 is free: `fuser -k 8080/tcp`
- Check DB is reachable

**All data disappears after ~15 minutes / "Could not identify current user"**
- JWT access tokens expire after 15 min; refresh tokens are stored in AsyncStorage and sent as JSON body on refresh
- Fix: ensure the latest backend is deployed and both `accessToken` + `refreshToken` are returned from `/api/auth/login`
- Workaround: log out and log back in to get a fresh token pair

**Frontend 403 errors after inactivity**
- Token expired and refresh failed — log out and log back in
- Check the backend is running and reachable at port 8080

**Demo/weekly performance not saving**
- Ensure `demo_number` and `week_start_date` columns exist in the DB (added by Hibernate on startup)
- If columns are missing, start the backend first, then verify with `\d demo_performance` in psql

**Electron won't launch / runs as Node**
- Use `npm run electron:dev`, not `npx electron` directly
- Ensure `npm run web` is running first

**Role-based views not showing correctly**
- Re-login to get a fresh JWT with updated role claims

## CI/CD

GitLab CI runs two jobs on push/MR:
- `backend-tests` — Maven test suite
- `frontend-quality` — ESLint + TypeScript type-check

Requires a GitLab Runner with Docker executor. Register one via Settings → CI/CD → Runners.

## License

Iowa State University Senior Design Program — Spring 2026
