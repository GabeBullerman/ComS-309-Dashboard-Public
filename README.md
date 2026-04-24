# Class Dashboard

A role-based classroom management system for Iowa State University's Senior Design (COM S 309) program. Built with Spring Boot (backend) and React Native/Expo (frontend), deployable as a web app, iOS/Android app, or Electron desktop app.

---

## Quick Start

### Local Development

**Backend:**
```bash
cd Backend
# Create .env with database credentials (see Environment Variables)
./mvnw spring-boot:run
# Starts on port 8080
```

**Frontend (web):**
```bash
cd frontend
npm install
npm run web         # Expo dev server — opens at http://localhost:8081
```

**Frontend (mobile):**
```bash
cd frontend
npm start           # Expo dev server — scan QR code for iOS/Android
```

**Frontend (Electron desktop):**
```bash
# Terminal 1
npm run web
# Terminal 2
npm run electron:dev
```

---

## Deployment

**VM:** `coms-4020-006.class.las.iastate.edu` (campus network / VPN required)  
**URL:** `http://coms-4020-006.class.las.iastate.edu:8080`

Spring Boot serves both the REST API and the built frontend on **port 8080**. The frontend must be built locally (Node 18+ required — the server runs Node 16).

### First-time server setup
```bash
ssh gbulle@coms-4020-006.class.las.iastate.edu
cd ~/ug_mk_4
git fetch origin && git reset --hard origin/main

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

### Deploy after changes (run locally)
```bash
# 1. Build frontend (Node 18+ required)
cd frontend
npm run build:web

# 2. Push built files to server
scp -r dist/* gbulle@coms-4020-006.class.las.iastate.edu:/home/gbulle/ug_mk_4/Backend/src/main/resources/static/

# 3. Pull backend changes and restart
ssh gbulle@coms-4020-006.class.las.iastate.edu
cd ~/ug_mk_4 && git pull
pkill -f "dashboard309" 2>/dev/null; sleep 1
cd Backend
nohup ./mvnw spring-boot:run > backend.log 2>&1 &
tail -f backend.log   # wait for "Started Dashboard309Application"
```

> **Note:** Built `dist/` files are gitignored — they exist only on the server. Rebuild and re-deploy after any frontend change.

> **Database note:** The `attendance` table has a check constraint on `status`. Adding new statuses requires a manual migration:
> ```bash
> sudo -u postgres psql -d class_dashboard -c "ALTER TABLE attendance DROP CONSTRAINT attendance_status_check"
> sudo -u postgres psql -d class_dashboard -c "ALTER TABLE attendance ADD CONSTRAINT attendance_status_check CHECK (status IN ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED'))"
> ```

---

## Features

### Authentication & Accounts
- **JWT Authentication** — Password login returns `accessToken` + `refreshToken`; auto-refresh on expiry
- **Google OAuth** — Sign in with Google; `prompt=select_account` forces account picker on every login
- **Forgot Password** — NetID-based email reset via SMTP (Gmail app password configured)
- **Change Password** — In-app password update with current password confirmation
- **Profile Avatars** — Individual avatar upload (camera/gallery) or bulk directory upload matching filenames to NetIDs; images compressed and stored in AsyncStorage

### Teams & Members
- **Team List** — Search, filter by section/TA/status; demo performance dot indicators on cards; responsive 1–4 column grid
- **Team Detail** — Edit team name, GitLab repo URL, Discord link, TA notes, and health status; bulk attendance and weekly performance grading per member; compliance analysis against GitLab contribution targets
- **Member Profiles** — Assign Frontend / Backend / Full Stack project role; view per-member attendance, comments, weekly progress, and GitLab statistics
- **Add / Remove Members** — Search existing students to add to a team; remove with confirmation
- **Manual Team Creation** — Create a team with name, section, TA, and students from within the app (no CSV required)

### Attendance
- **Calendar UI** — Month-view calendar; per-day status dot indicators; tap to record/edit
- **Four Statuses** — Present, Late, Absent, Excused (per lecture or TA meeting)
- **Semester-Aware** — Calendar constrained to semester start date; days before start dimmed and untappable
- **Hybrid View** — Toggle between All, Lecture, and TA Meeting records; per-tab summary counts
- **Bulk Grading** — Inline 4-status selector per student directly on the team detail page

### Performance Grading
- **Weekly Performance** — Grade students each week on code and teamwork (Poor / Moderate / Good); semester-aligned week picker (W1–W16) defaulting to the current week; scrollable dropdown
- **Demo Performance** — Grade up to 4 demos per student; score circles shown on team cards and the team list

### At-Risk Students
- **Automatic Detection** — Flags students for: lecture absences (warning ≥3, critical ≥5), habitual lateness (≥3 lates), poor demo performance (2+ demos scored 0), poor weekly performance (3+ weeks scored 0/0)
- **Manual Override** — Staff can manually flag any student as at-risk with a reason; shown on the at-risk screen with the reason text; clearable
- **TA Scoping** — TAs only see students from their assigned teams; role-appropriate empty states
- **Email Tooling** — Select individual students or filter by severity/category; pre-populated email templates (attendance, performance, or general); copyable BCC list for Outlook

### Tasks
- **Assignment** — Create and assign tasks to teams or individual students with title, due date, and description; attach files
- **Status Tracking** — To-Do / In Progress / Complete with color-coded cards; overdue tasks highlighted in red
- **Editing** — Edit and delete tasks; status update toggle for TAs and above; per-recipient status bubbles
- **My Assignments** — Students see only their own tasks in a dedicated view

### Comments
- **Per-member and per-team** comments with Good / Moderate / Poor status tags
- **Visibility** — Mark comments private (hidden from students); public comments visible to the subject student
- **Editing** — Authors can edit or delete; HTAs/Instructors can delete any comment

### Staff Chat
- **Channels** — `#general`, `#announcements`, `#grading`, `#tech-help`, `#off-topic`; Instructors can rename channels and add descriptions
- **Messages** — Send, edit, and delete messages; reply threading; message grouping by sender
- **Mentions** — `@netid` and `@role` mentions with autocomplete; mentioned names highlighted in messages; self-mentions highlighted differently
- **Emoji Picker** — Categorized emoji panel (Smileys, Gestures, Tech, Food)
- **Typing Indicators** — Live "X is typing..." with 3-second debounce
- **Unread Counts** — Per-channel badge counts; total shown on nav tab
- **Announcements** — Read-only for non-Instructors

### GitLab Integration
- **Personal Access Token** — Configured per-user in Profile (stored in AsyncStorage + synced to backend); shows "configure in Profile" state if missing
- **Per-member Stats** — Commit size (additions/deletions/files changed), commit frequency (all weeks), and merge request activity; week-picker dropdown defaulting to current week; loading spinner while fetching
- **Compliance Analysis** — Per-team weekly compliance check: Frontend members need 40+ meaningful line additions; Backend members need 2+ meaningful Spring annotations; results shown with pass/fail indicators
- **Contributor Matching** — Matches GitLab contributors to team members by NetID (primary) or display name (fallback); merges duplicate git-config entries per person

### Data Management
- **CSV / Excel Import** — Drag-and-drop or browse to import class roster and team assignments; per-file upload progress display; inline format guide
- **Bulk Avatar Upload** — Web: choose files or entire folder; Mobile: photo picker; filename-to-NetID matching; unchanged detection
- **Export** — Download full class data as an Excel workbook (students sheet + one sheet per team with attendance, demo, and weekly performance)
- **Semester Settings** — Instructors set the semester start date (used by attendance, weekly performance, and GitLab stats)
- **Clear Semester** — Instructor-only danger zone; permanently deletes all teams and students (staff accounts preserved); requires typing `CLEAR SEMESTER` to confirm

### Navigation & UX
- **Role-based navigation** — Different tab sets per role; Student sees only their own team and assignments
- **Dark / Light mode** — System-aware default; toggleable from Profile; persisted across sessions
- **Responsive layout** — Mobile-first with desktop breakpoints; side-by-side panels on wide screens
- **Cross-platform** — Web (Expo), iOS, Android, Electron desktop

---

## Role Permissions

| Feature | Student | TA | HTA | Instructor |
|---|---|---|---|---|
| View teams | Own only | Assigned | All | All |
| Edit team info / repo URL | ✗ | ✓ | ✓ | ✓ |
| Record / edit attendance | ✗ | ✓ | ✓ | ✓ |
| Grade weekly / demo performance | ✗ | ✓ | ✓ | ✓ |
| View at-risk students | ✗ | ✓ (own students) | ✓ | ✓ |
| Manually flag at-risk | ✗ | ✓ | ✓ | ✓ |
| Create / assign tasks | ✗ | ✓ | ✓ | ✓ |
| Update task status | ✗ | ✓ | ✓ | ✓ |
| Write / delete comments | ✗ | ✓ | ✓ | ✓ |
| Mark comments private | ✗ | ✓ | ✓ | ✓ |
| Use staff chat | ✗ | ✓ | ✓ | ✓ |
| Rename chat channels | ✗ | ✗ | ✗ | ✓ |
| View / manage student list | ✗ | ✓ (own students) | ✓ | ✓ |
| Delete students | ✗ | ✗ | ✓ | ✓ |
| Upload class roster (CSV/Excel) | ✗ | ✗ | ✓ | ✓ |
| Export data | ✗ | ✗ | ✓ | ✓ |
| Manage TAs / HTAs | ✗ | ✗ | ✗ | ✓ |
| Set semester start date | ✗ | ✗ | ✗ | ✓ |
| Clear semester data | ✗ | ✗ | ✗ | ✓ |

---

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

---

## Tech Stack

**Backend:** Java 17, Spring Boot 3.2.3, Spring Security + JWT (JJWT 0.11.5), Google OAuth2, Spring Mail, PostgreSQL (`ddl-auto: update`), Maven

**Frontend:** React Native 0.81.5, Expo 54, TypeScript 5.3, React 19, NativeWind 4 / TailwindCSS, Axios, React Navigation 7, Electron 28 + electron-builder

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| `POST` | `/login` | Password login → `{ accessToken, refreshToken }` |
| `POST` | `/login/google` | Google OAuth login → `{ accessToken, refreshToken }` |
| `POST` | `/refresh` | Body: `{ refreshToken }` → `{ accessToken, refreshToken }` |
| `POST` | `/logout` | Invalidates refresh token |
| `POST` | `/forgot-password` | Sends reset email for a given NetID |
| `POST` | `/reset-password` | Completes password reset with token |
| `POST` | `/change-password` | Changes password (requires current password) |

### Users — `/api/users`
| Method | Path | Description |
|---|---|---|
| `GET` | `/self` | Current user |
| `GET` | `/` | List users (filterable by role) |
| `POST` | `/` | Create user |
| `PUT` | `/{id}` | Update user |
| `DELETE` | `/{id}` | Delete user |
| `GET` | `/netid/{netid}` | Find user by NetID |
| `PUT` | `/{id}/project-role` | Set Frontend / Backend / Full Stack role |
| `GET` | `/{netid}/gitlab-token` | Retrieve stored GitLab token |
| `PUT` | `/{netid}/gitlab-token` | Save GitLab personal access token |

### Teams — `/api/teams`
| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List teams (filter by taNetid, section, status) |
| `GET` | `/{id}` | Get single team |
| `PUT` | `/{id}` | Update team (name, repo URL, Discord, TA notes, status) |
| `POST` | `/` | Create team |
| `DELETE` | `/{id}` | Delete team |
| `GET` | `/{id}/students` | List students on a team |
| `PUT` | `/{id}/add/{studentId}` | Add student to team |
| `PUT` | `/{id}/remove/{studentId}` | Remove student from team |
| `DELETE` | `/clear` | Delete all teams and their students (Instructor only) |

### Attendance — `/api/attendance`
| Method | Path | Description |
|---|---|---|
| `GET` | `/student/{netid}` | All attendance records for a student |
| `POST` | `/` | Create record |
| `PUT` | `/{id}` | Update record |
| `DELETE` | `/{id}` | Delete record |

### Weekly Performance — `/api/weekly-performance`
| Method | Path | Description |
|---|---|---|
| `GET` | `/student/{netid}` | All weekly records for a student |
| `POST` | `/` | Create/upsert by `(studentNetid, weekStartDate)` |
| `PUT` | `/{id}` | Update record |
| `DELETE` | `/{id}` | Delete record |

### Demo Performance — `/api/demo-performance`
| Method | Path | Description |
|---|---|---|
| `GET` | `/student/{netid}` | All demo records for a student |
| `POST` | `/` | Create/upsert by `(studentNetid, demoNumber)` |
| `PUT` | `/{id}` | Update record |
| `DELETE` | `/{id}` | Delete record |

### Tasks — `/api/tasks`
| Method | Path | Description |
|---|---|---|
| `GET` | `/assigned-to/{netid}` | Tasks assigned to a user |
| `GET` | `/assigned-by/{netid}` | Tasks created by a user |
| `POST` | `/` | Create task |
| `PUT` | `/{id}` | Update task |
| `DELETE` | `/{id}` | Delete task |
| `POST` | `/{id}/files` | Attach file to task |
| `GET` | `/{id}/files/{fileId}` | Download task attachment |

### Comments — `/api/comments`
| Method | Path | Description |
|---|---|---|
| `GET` | `/team/{teamId}` | All comments for a team |
| `GET` | `/team/{teamId}/user/{netid}` | Member-specific comments |
| `GET` | `/team/{teamId}/general` | Team-level comments |
| `POST` | `/` | Create member comment |
| `POST` | `/team/{teamId}/general` | Create team comment |
| `PUT` | `/{id}` | Edit comment (author only) |
| `DELETE` | `/{id}` | Delete comment |

### Chat — `/api/chat`
| Method | Path | Description |
|---|---|---|
| `GET` | `/messages/{channel}` | Fetch messages (paginated, `before` cursor) |
| `POST` | `/messages` | Send message |
| `PUT` | `/messages/{id}` | Edit message |
| `DELETE` | `/messages/{id}` | Delete message |
| `POST` | `/messages/{id}/read` | Mark message as read in channel |
| `GET` | `/unread` | All unread counts per channel |
| `GET` | `/channels` | List channels with metadata |
| `PUT` | `/channels/{id}` | Update channel display name / description |
| `POST` | `/typing/{channel}` | Signal typing (TTL-based) |
| `GET` | `/typing/{channel}` | Get currently-typing user names |

### At-Risk Overrides — `/api/at-risk-overrides`
| Method | Path | Description |
|---|---|---|
| `GET` | `/` | All overrides |
| `GET` | `/student/{netid}` | Overrides for a specific student |
| `POST` | `/` | Create override (manual flag) |
| `DELETE` | `/student/{netid}` | Clear all overrides for a student |

### App Settings — `/api/settings`
| Method | Path | Description |
|---|---|---|
| `GET` | `/semester-start` | Get semester start date |
| `PUT` | `/semester-start` | Set semester start date (Instructor only) |

### File Import/Export — `/api/file`
| Method | Path | Description |
|---|---|---|
| `POST` | `/import` | Upload CSV/Excel to bulk-import roster and teams |
| `GET` | `/export` | Download full class data as `.xlsx` |

### Roles & Permissions — `/api/roles`, `/api/permissions`
- Role and permission management (Instructor only)

### Docs
- `GET /swagger-ui/**` — Swagger UI
- `GET /v3/api-docs` — OpenAPI spec

---

## Environment Variables

### Backend — `Backend/.env` (gitignored)

```
SPRING_DATASOURCE_URL=jdbc:postgresql://{host}:{port}/class_dashboard
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SERVER_PORT=8080
JWT_SECRET={base64-encoded-256-bit-secret}
GOOGLE_CLIENT_ID={from Google Cloud Console}
GOOGLE_CLIENT_SECRET={from Google Cloud Console}
FRONTEND_URL=http://localhost:8081
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME={gmail address}
MAIL_PASSWORD={gmail app password}
MAIL_FROM={display from address}
```

**Google OAuth setup (one-time):** Add to Authorized Redirect URIs in Google Cloud Console:
- `http://localhost:8080/login/oauth2/code/google`
- `http://coms-4020-006.class.las.iastate.edu:8080/login/oauth2/code/google`

### Frontend — `frontend/.env.local` (gitignored, optional)

By default the app points to the VM backend. Override for local development:

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080   # Android emulator → host machine
# EXPO_PUBLIC_API_URL=http://localhost:8080  # iOS simulator / web
```

After changing, restart Metro with `npx expo start --clear`.

---

## Project Structure

```
ug_mk_4/
├── Backend/
│   ├── src/main/java/edu/iastate/dashboard309/
│   │   ├── authentication/   # SecurityConfig, JwtFilter, JwtService,
│   │   │                     # OAuth2LoginSuccessHandler, CustomUserDetails
│   │   ├── config/           # Application configuration beans
│   │   ├── controller/       # REST controllers:
│   │   │                     #   Auth, User, Team, Task, TaskFile,
│   │   │                     #   Attendance, WeeklyPerformance, DemoPerformance,
│   │   │                     #   Comment, Chat, AtRiskOverride,
│   │   │                     #   AppSettings, Import, Role, Permission
│   │   ├── service/          # Business logic layer
│   │   ├── model/            # JPA entities (User, Team, Attendance, Task,
│   │   │                     #   WeeklyPerformance, DemoPerformance, Comment,
│   │   │                     #   ChatMessage, ChatChannel, AtRiskOverride,
│   │   │                     #   AppSettings, RefreshToken, Permission, ...)
│   │   ├── repository/       # Spring Data JPA repositories
│   │   └── dto/              # Request/response DTOs
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── static/           # Built frontend (gitignored, deployed via SCP)
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── api/              # client.ts (Axios + JWT interceptor),
│   │   │                     # attendance.ts, chat.ts, comments.ts,
│   │   │                     # demoPerformance.ts, weeklyPerformance.ts,
│   │   │                     # tasks.ts, teams.ts, users.ts,
│   │   │                     # atRiskOverrides.ts, settings.ts
│   │   ├── components/       # TeamCard, MemberAttendance, WeeklyPerformance,
│   │   │                     # GitlabStats, TeamProgress, AtRiskStudentCard,
│   │   │                     # Comments, MemberAvatar, ProfileAvatar,
│   │   │                     # StudentListCard, DropZone, FileUpload,
│   │   │                     # ThemeToggle
│   │   ├── screens/          # DashboardScreen, TeamsScreen, TeamDetail,
│   │   │                     # TeamMemberDetail, AtRiskStudentsScreen,
│   │   │                     # StudentListScreen, TaskAssignmentScreen,
│   │   │                     # AssignmentsScreen, StaffChatScreen,
│   │   │                     # UploadScreen, TAManager, ProfileScreen,
│   │   │                     # LoginPage
│   │   ├── contexts/         # ThemeContext
│   │   ├── constants/        # colors.ts (theme palette)
│   │   ├── types/            # Teams.ts, shared type definitions
│   │   └── utils/            # auth.ts (login/role helpers), gitlab.ts
│   │                         #   (pagination, commit/MR fetch, compliance)
│   ├── electron/
│   │   └── main.js           # Electron main process
│   ├── App.tsx               # Root navigator + auth state machine
│   └── package.json
└── README.md
```

---

## Frontend Scripts

```bash
npm run web             # Expo web dev server (port 8081)
npm start               # Expo dev server (iOS / Android / Web)
npm run android         # Run on Android device/emulator
npm run ios             # Run on iOS simulator
npm run electron:dev    # Electron desktop (requires npm run web first)
npm run electron:build  # Build distributable (Windows/macOS/Linux)
npm run build:web       # Production web build → dist/
npm run lint            # ESLint
npm run type-check      # TypeScript (no emit)
```

---

## Troubleshooting

**Backend won't start**
- Verify `Backend/.env` exists with all required variables
- Check port 8080 is free: `fuser -k 8080/tcp`
- Confirm PostgreSQL is running and the `class_dashboard` database exists

**"Could not identify current user" / data disappears after ~15 min**
- JWT access tokens expire after 15 min. The Axios interceptor should auto-refresh using the stored `refreshToken`
- If refresh fails, log out and back in for a fresh token pair
- Verify both `accessToken` and `refreshToken` are returned from `/api/auth/login`

**Frontend 403 errors after inactivity**
- Token expired and refresh failed — log out and log back in
- Confirm the backend is reachable at port 8080

**EXCUSED attendance status rejected by the database**
- The `attendance_status_check` constraint must be updated manually; Hibernate does not modify existing check constraints
- See the "Database note" in the Deployment section above

**Demo / weekly performance not saving**
- Ensure `demo_number` and `week_start_date` columns exist (Hibernate adds them on first startup)
- Verify with `\d demo_performance` in psql

**GitLab stats panel shows "token not configured"**
- Open the Profile tab and paste a GitLab personal access token (scope: `read_api`)
- Generate one at `git.las.iastate.edu → Settings → Access Tokens`

**GitLab stats are empty / show wrong data**
- Confirm the team's GitLab URL is set correctly in Team Detail (edit pencil icon)
- The token must have `read_api` scope and access to the project
- Commits are matched by NetID in author email (primary) or last name (fallback) — mismatches happen if the student's git config doesn't contain their ISU email

**Google OAuth logs in as wrong account / no account picker**
- The authorization URI includes `prompt=select_account` — if it still skips the picker, clear cookies for `accounts.google.com`
- Ensure the backend called `POST /api/auth/logout` to invalidate the server session before re-login

**500 errors when switching between Google and password login**
- Call `POST /api/auth/logout` before switching to invalidate the server-side session

**Electron won't launch**
- Use `npm run electron:dev`, not `npx electron` directly
- Ensure `npm run web` is running first in a separate terminal

**Role-based views not showing correctly after a role change**
- Log out and back in — the JWT carries the role claims and must be reissued

---

## CI/CD

GitLab CI runs on every push and merge request:

- **`backend-tests`** — Maven test suite (`mvn test`)
- **`frontend-quality`** — ESLint + TypeScript type-check (`npm run lint && npm run type-check`)

Requires a GitLab Runner with a Docker executor. Register one at Settings → CI/CD → Runners.

---

## License

Iowa State University Senior Design Program — COM S 309, Spring 2026
