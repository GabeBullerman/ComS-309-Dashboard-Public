# Class Dashboard

A mobile application for managing class activities, teams, assignments, and TA management with role-based access for students, teaching assistants, and instructors at Iowa State University.

## Project Structure

```
4020C-Project/
├── Backend/                    # Spring Boot Java backend
│   ├── docker-compose.yml      # Docker configuration for database
│   ├── pom.xml                 # Maven configuration
│   ├── mvnw                    # Maven wrapper
│   └── src/
│       ├── main/
│       │   ├── java/
│       │   │   └── edu/iastate/dashboard309/
│       │   │       ├── DashboardApplication.java
│       │   │       ├── controller/    # REST API controllers
│       │   │       │   ├── PermissionController.java
│       │   │       │   ├── RoleController.java
│       │   │       │   ├── TaskController.java
│       │   │       │   ├── TaskFileController.java
│       │   │       │   ├── TeamController.java
│       │   │       └── UserController.java
│       │   │       ├── dto/          # Data transfer objects
│       │   │       ├── model/        # JPA entities
│       │   │       ├── repository/   # JPA repositories
│       │   │       └── service/      # Business logic services
│       │   └── resources/
│       │       ├── application.yml   # Application configuration
│       │       └── db/migration/     # Database migrations
│       └── test/                     # Unit tests
├── Documents/                 # Project documentation
├── frontend/                  # React Native/Expo frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── FilterBar.tsx
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LoginRegisterPage.tsx
│   │   │   ├── SidebarLayout.tsx
│   │   │   └── TeamCard.tsx
│   │   ├── data/              # Mock data
│   │   ├── Images/            # Static images
│   │   ├── screens/           # Screen components
│   │   │   ├── AssignmentsScreen.tsx
│   │   │   ├── Courses.tsx
│   │   │   ├── TAHome.tsx
│   │   │   ├── TAManager.tsx
│   │   │   ├── TaskAssignmentScreen.tsx
│   │   │   └── TeamsScreen.tsx
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   │       └── auth.ts
│   ├── App.tsx                # Main app component
│   ├── app.json               # Expo configuration
│   ├── package.json           # Node.js dependencies
│   └── tsconfig.json          # TypeScript configuration
└── README.md
```

## Tech Stack

**Frontend:**
- React Native / Expo
- TypeScript
- NativeWind (Tailwind CSS for React Native)
- React Navigation
- AsyncStorage for local persistence

**Backend:**
- Java 17+
- Spring Boot
- Spring Data JPA
- PostgreSQL
- Maven
- Docker & Docker Compose

## Prerequisites

- Node.js 18+ and npm
- Java 17+
- Maven 3.6+
- Docker and Docker Compose
- Git

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://git.las.iastate.edu/SeniorDesignComS/2026spr/402c/ug_mk_4.git
cd 4020C-Project
```

### 2. Backend Setup
```bash
cd Backend

# Install dependencies
./mvnw install

# Start the database and backend services
docker-compose up -d
```

The backend will be available at `http://localhost:8080`

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Install additional Expo packages
npx expo install react-native-gesture-handler react-native-reanimated
```

## Running the Application

### Backend
```bash
cd Backend
./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend

# Web version (recommended for development)
npm run web

# Or run on specific platforms:
npm run ios      # iOS (macOS only)
npm run android  # Android
npm start        # Start Expo CLI
```

The frontend will be available at `http://localhost:8081` (web) or via Expo Go app on mobile.

## Available Scripts

### Frontend
```bash
npm run web          # Run on web
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run lint         # Run ESLint
npm run type-check   # Type checking
```

### Backend
```bash
./mvnw clean         # Clean build
./mvnw compile       # Compile
./mvnw test          # Run tests
./mvnw spring-boot:run  # Run application
```

## API Endpoints

The backend provides RESTful APIs for:

- **Users**: `/api/users` - User management
- **Teams**: `/api/teams` - Team management
- **Tasks**: `/api/tasks` - Task/assignment management
- **Permissions**: `/api/permissions` - Permission management
- **Roles**: `/api/roles` - Role management
- **Task Files**: `/api/task-files` - File attachments for tasks

## Features

- **Role-based Access Control**: Different permissions for Students, TAs, Head TAs, and Instructors
- **Team Management**: View and manage class teams
- **Task Management**: Create, assign, and track assignments
- **TA Management**: Invite and manage teaching assistants (Instructor only)
- **Course Management**: View course information
- **Responsive Design**: Works on web, iOS, and Android

## Development

### Adding New Features
1. For frontend changes: Edit files in `frontend/src/`
2. For backend changes: Edit files in `Backend/src/main/java/`
3. Run type checking: `npm run type-check` (frontend) or `./mvnw compile` (backend)
4. Test changes: Run the respective application

### Database
The application uses PostgreSQL with Flyway migrations. Database schema is defined in `Backend/src/main/resources/db/migration/`.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and type checking
4. Submit a merge request

## License

This project is part of Iowa State University's Senior Design program.
