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

**Frontend:**
```bash
cd frontend
npm install
npm start
```

### Deployment (VM at coms-4020-006.class.las.iastate.edu)

**Backend:**
```bash
ssh your-netid@coms-4020-006.class.las.iastate.edu
cd ~/ug_mk_4/Backend

# Create .env file (IMPORTANT: .env is gitignored)
cat > .env << 'EOF'
SPRING_DATASOURCE_URL=jdbc:postgresql://coms-4020-006.class.las.iastate.edu:5432/class_dashboard
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SERVER_PORT=8080
JWT_SECRET=Pu5XofXF6IEnT0ud+uLJ2rfe96Wyr/OWRoIp7F8A8PM
EOF

# Build and run
./mvnw clean package -DskipTests
nohup java -jar target/class-dashboard-0.0.2-SNAPSHOT.jar > backend.log 2>&1 &
```

**Frontend:**
Deploy to VM and update API URL in `src/utils/auth.ts`:
```typescript
let apiBaseUrl = 'http://coms-4020-006.class.las.iastate.edu:8080';
```

## Features

- **Role-Based Access Control**: Student, TA, HTA (Head TA), Instructor
- **JWT Authentication**: Secure token-based login
- **Team Management**: View and manage student teams
- **Task Assignment**: Create and assign tasks to teams/students
- **Course Management**: View course information
- **TA Management**: Invite and manage TAs (Instructor only)
- **Responsive UI**: Works on web, iOS, and Android

## Role Permissions

| Feature | Student | TA | HTA | Instructor |
|---------|---------|----|----|-----------|
| View Teams | Own only | All | All | All |
| View Courses | ✗ | ✓ | ✓ | ✓ |
| Assign Tasks | ✗ | ✗ | ✓ | ✓ |
| View Past Semesters | ✗ | ✗ | ✓ | ✓ |
| Manage TAs | ✗ | ✗ | ✗ | ✓ |

## Test Users

Use these credentials to test different roles:

```
Email Format: {netid}@iastate.edu

Student:     netid=student     password=student
TA:          netid=ta          password=ta
HTA:         netid=hta         password=hta
Instructor:  netid=instructor  password=instructor
```

## Tech Stack

**Backend:**
- Java 17
- Spring Boot 3.2.3
- Spring Security with JWT
- PostgreSQL
- Flyway migrations
- Maven

**Frontend:**
- React Native
- Expo
- TypeScript
- TailwindCSS (NativeWind)
- Axios for HTTP
- AsyncStorage for persistence

## Architecture

### Backend API Endpoints

- `POST /api/auth/login` - User authentication (returns JWT token)
- `POST /api/auth/logout` - User logout
- `GET /api/users/self` - Get current user info
- `GET /api/teams` - List teams
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/courses` - Course management
- `GET /api/v3/api-docs` - OpenAPI specification

### Frontend Flow

1. **Login** → Extract role from JWT token
2. **Route** → Display role-appropriate home screen
3. **Sidebar Navigation** → Show menus based on permissions
4. **API Calls** → All requests include Bearer token

## Environment Variables

### Backend (.env file - must be created manually)

```
SPRING_DATASOURCE_URL=jdbc:postgresql:{host}:{port}/class_dashboard
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SERVER_PORT=8080
JWT_SECRET={base64-encoded-secret}
```

### Frontend (src/utils/auth.ts)

```typescript
let apiBaseUrl = 'http://{host}:8080';
```

## CORS Configuration

Backend allows requests from:
- localhost:8081, localhost:8082, localhost:19006 (development)
- coms-4020-006.class.las.iastate.edu:8080 (production)

See `SecurityConfig.java` for details.

## Building & Testing

**Backend:**
```bash
cd Backend
./mvnw clean package -DskipTests    # Build
./mvnw test                          # Run tests
./mvnw spring-boot:run               # Run locally
```

**Frontend:**
```bash
cd frontend
npm run lint                          # Linting
npm run type-check                    # Type checking
npm start                             # Start dev server
```

## Important Notes

- **.env file is gitignored** - Must be created manually on each deployment
- **Port 8080 is required** - Configured via SSG security group
- **Database at coms-4020-006:5432** - Only accessible from VM
- **JWT tokens expire** - Default expiration in backend config
- **CORS must include both localhost and VM domain** for development

## Project Structure

```
4020C-Project/
├── Backend/
│   ├── src/main/java/edu/iastate/dashboard309/
│   │   ├── controller/        # REST API endpoints
│   │   ├── service/           # Business logic
│   │   ├── model/             # JPA entities
│   │   ├── repository/        # Data access
│   │   ├── dto/               # Data transfer objects
│   │   └── authentication/    # Security config & JWT
│   ├── src/main/resources/
│   │   ├── application.yml    # Spring config
│   │   └── db/migration/      # Flyway SQL migrations
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── screens/           # Full-page screens
│   │   ├── utils/auth.ts      # API & authentication
│   │   └── types/             # TypeScript definitions
│   ├── App.tsx                # Main navigation
│   └── package.json
└── README.md
```

## Troubleshooting

**Backend won't start:**
- Verify .env file exists in Backend/ directory
- Check JWT_SECRET is set
- Ensure port 8080 is available
- Check database connectivity

**Frontend can't login:**
- Verify backend is running at correct URL
- Check CORS headers in browser console
- Ensure test user credentials match database

**Role-based views not showing:**
- Clear browser async storage: `await AsyncStorage.removeItem('user_role')`
- Re-login to fetch new JWT token
- Check browser console for JWT decode errors

## License

Iowa State University Senior Design Program
