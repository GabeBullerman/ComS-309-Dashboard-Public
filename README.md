# Class Dashboard

A role-based classroom management system built with Spring Boot (backend) and React Native/Expo (frontend). Enables instructors, TAs, and students to manage teams, assignments, and course activities.

## Quick Start

### Local Development

**Backend:**
```bash
cd Backend
# Create .env file with database credentials
cat > .env << 'EOF'
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/class_dashboard
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SERVER_PORT=8080
JWT_SECRET=your-secret-key-here
EOF

./mvnw spring-boot:run
```

**Frontend (web/mobile):**
```bash
cd frontend
npm install
npm start           # iOS/Android/Web via Expo
npm run web         # Web only (Metro bundler on port 8081)
```

**Frontend (Electron desktop):**
```bash
cd frontend
npm run web         # Terminal 1 — start Expo web dev server
npm run electron:dev  # Terminal 2 — launch desktop app
```

### Deployment (VM at coms-4020-006.class.las.iastate.edu)

```bash
ssh gbulle@coms-4020-006.class.las.iastate.edu
cd ~/ug_mk_4

# Pull latest from your branch
git fetch origin
git reset --hard origin/Gabe   # or whichever branch

# Create .env file if it doesn't exist (gitignored)
cat > Backend/.env << 'EOF'
SPRING_DATASOURCE_URL=jdbc:postgresql://coms-4020-006.class.las.iastate.edu:5432/class_dashboard
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SERVER_PORT=8080
JWT_SECRET=Pu5XofXF6IEnT0ud+uLJ2rfe96Wyr/OWRoIp7F8A8PM
EOF

# Kill existing backend and restart
pkill -f "dashboard309" 2>/dev/null; sleep 1
cd Backend
nohup ./mvnw spring-boot:run > backend.log 2>&1 &
tail -f backend.log   # watch for "Started Dashboard309Application"
```

## Features

- **Role-Based Access Control**: Student, TA, HTA (Head TA), Instructor
- **JWT Authentication**: Secure token-based login
- **Team Management**: View, search, and filter student teams; edit team name and repo URL
- **Member Project Roles**: Assign Frontend / Backend / Full Stack role per team member (persisted to DB)
- **Repo Linking**: Add/edit a GitLab repo URL per team; clickable "View Project" button
- **Task Assignment**: Create and assign tasks to teams/students
- **Course Management**: View course information
- **TA Management**: Invite and manage TAs (Instructor only)
- **Cross-Platform**: Web, iOS, Android, and **Electron desktop app**

## Role Permissions

| Feature | Student | TA | HTA | Instructor |
|---------|---------|-----|-----|-----------|
| View Teams | Own only | Assigned | All | All |
| View Courses | ✗ | ✓ | ✓ | ✓ |
| View Past Semesters | ✗ | ✗ | ✓ | ✓ |
| Edit Team Info / Repo | ✗ | ✓ | ✓ | ✓ |
| Assign Member Project Roles | ✗ | ✓ | ✓ | ✓ |
| Manage TAs | ✗ | ✗ | ✗ | ✓ |

## Test Users

```
Email format: {netid}@iastate.edu

Instructor:  netid=instructor   password=instructor
HTA:         netid=hta          password=hta
TA:          netid=ta           password=ta
Student:     netid=student      password=student

Test students (24 accounts across 6 teams):
  student1@iastate.edu  through  student24@iastate.edu
  password: Password123!

  Team A1: student1–student4
  Team A2: student5–student8
  Team A3: student9–student12
  Team B1: student13–student16
  Team B2: student17–student20
  Team B3: student21–student24
```

## Tech Stack

**Backend:**
- Java 17, Spring Boot 3.2.3
- Spring Security with JWT (JJWT 0.11.5)
- PostgreSQL, Flyway migrations
- Maven

**Frontend:**
- React Native 0.81.5 + Expo 54
- TypeScript
- NativeWind / TailwindCSS
- Axios, React Navigation 7
- Electron 28 (desktop)

## API Endpoints

**Auth:**
- `POST /api/auth/login` — returns JWT token
- `POST /api/auth/logout`

**Users:**
- `GET /api/users/self` — current user info
- `GET /api/users` — list users (filterable by role/search)
- `POST /api/users` — create user
- `PUT /api/users/{id}` — update user
- `PUT /api/users/{id}/project-role` — update a user's project role (Frontend/Backend/Full Stack)
- `DELETE /api/users/{id}`

**Teams:**
- `GET /api/teams` — list teams (filterable by taNetid, section, status)
- `GET /api/teams/{id}` — get team (includes students with projectRole)
- `PUT /api/teams/{id}` — update team (name, gitlab URL, status, taNotes, taNetid)
- `GET /api/teams/{id}/students`
- `PUT /api/teams/{id}/add/{studentId}`
- `PUT /api/teams/{id}/remove/{studentId}`

**Tasks:**
- `GET /api/tasks/assigned-to/{netid}`
- `GET /api/tasks/assigned-by/{netid}`
- `POST /api/tasks`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`

**Docs:**
- `GET /v3/api-docs` — OpenAPI specification
- `GET /swagger-ui/**` — Swagger UI

## Frontend Scripts

```bash
npm start               # Expo dev server (iOS/Android/Web)
npm run web             # Web only (port 8081)
npm run android         # Android
npm run ios             # iOS
npm run electron:dev    # Desktop app (requires npm run web running first)
npm run electron:build  # Build distributable desktop app (Windows/macOS/Linux)
npm run lint
npm run type-check
```

## Electron Desktop App

The desktop app wraps the Expo web build in an Electron window.

**Dev mode** loads live from the Expo web dev server (`http://localhost:8081`).
**Production build** (`npm run electron:build`) exports the web bundle and packages it via electron-builder.

> **Note:** `ELECTRON_RUN_AS_NODE` is set by Expo/Metro for its own tooling. The launcher script (`scripts/electron-dev.js`) clears this before spawning Electron so it runs as a proper desktop app rather than a Node.js process.

Output targets: Windows (NSIS installer + portable), macOS (dmg + zip), Linux (AppImage).

## Environment Variables

### Backend (`.env` — gitignored, must be created manually)

```
SPRING_DATASOURCE_URL=jdbc:postgresql:{host}:{port}/class_dashboard
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SERVER_PORT=8080
JWT_SECRET={base64-encoded-secret}

# Google OAuth (backend-initiated flow)
GOOGLE_CLIENT_ID=124195890479-kh157q1foah7sc96ckjbvdvrdt9esu0q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET={secret from Google Cloud Console → web application credentials}
FRONTEND_URL=http://localhost:8081
```

**On the VM**, also set:
```
FRONTEND_URL=http://coms-4020-006.class.las.iastate.edu:{frontend port}
```

**Google Cloud Console — one-time setup:**
In your web application credential, add these to **Authorized redirect URIs**:
- `http://localhost:8080/login/oauth2/code/google`
- `http://coms-4020-006.class.las.iastate.edu:8080/login/oauth2/code/google`

### Frontend

API base URL is set in `frontend/src/utils/auth.ts`:
```typescript
let apiBaseUrl = 'http://coms-4020-006.class.las.iastate.edu:8080';
```

## CORS Configuration

Backend allows requests from:
- `localhost:8081`, `localhost:8082`, `localhost:19006` (development)
- `coms-4020-006.class.las.iastate.edu:8080` (production)

See `SecurityConfig.java` for full config.

## Building & Testing

**Backend:**
```bash
cd Backend
./mvnw spring-boot:run          # Run locally
./mvnw test                     # Run tests
./mvnw clean package -DskipTests  # Build JAR
```

**Frontend:**
```bash
cd frontend
npm run lint
npm run type-check
```

## Project Structure

```
4020C-Project/
├── Backend/
│   ├── src/main/java/edu/iastate/dashboard309/
│   │   ├── controller/        # REST API endpoints
│   │   ├── service/           # Business logic
│   │   ├── model/             # JPA entities (User, Team, Task, Role...)
│   │   ├── repository/        # Spring Data JPA repositories
│   │   ├── dto/               # Request/response records
│   │   └── authentication/    # SecurityConfig, JwtFilter, JwtService
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/      # Flyway SQL migrations
│   └── pom.xml
├── frontend/
│   ├── electron/
│   │   └── main.js            # Electron main process
│   ├── scripts/
│   │   ├── electron-dev.js    # Dev launcher (clears ELECTRON_RUN_AS_NODE)
│   │   └── electron-build.js  # Production build launcher
│   ├── src/
│   │   ├── components/        # LoginRegisterPage, SidebarLayout, TeamCard
│   │   ├── screens/           # TeamsScreen, TeamDetail, TAManager, Courses...
│   │   ├── data/teams.ts      # Team/TeamMember type definitions
│   │   └── utils/auth.ts      # Axios instance, API helpers, JWT utils
│   ├── App.tsx                # Root navigation + auth state
│   ├── electron-builder.yml   # Desktop build config
│   └── package.json
└── README.md
```

## Troubleshooting

**Backend won't start:**
- Verify `.env` exists in `Backend/` directory
- Check `JWT_SECRET` is set
- Ensure port 8080 is available (`fuser -k 8080/tcp`)
- Check DB connectivity

**Frontend can't login:**
- Verify backend is running at the correct URL
- Check browser console for CORS or network errors
- Stale JWT causing 403? Clear `auth_token` from AsyncStorage and re-login

**Electron won't launch / runs as Node instead of app:**
- Run via `npm run electron:dev` (not `npx electron`) — the launcher script clears `ELECTRON_RUN_AS_NODE`
- Ensure `npm run web` is running first (dev mode connects to `localhost:8081`)

**Role-based views not showing correctly:**
- Re-login to get a fresh JWT with updated roles
- Roles come from the JWT token claims, not local storage

## License

Iowa State University Senior Design Program
