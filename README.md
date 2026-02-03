<<<<<<< README.md
# Instructor Dashboard - Frontend

## Project Structure

```
4020C Project/
├── frontend/              # React Native/Expo TypeScript app
│   ├── src/
│   │   └── components/
│   │       └── LandingPage.tsx
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

## Installation & Setup Commands

### Prerequisites
- Node.js 18+ and npm/yarn
- Git

### 1. Initialize Git Repository
```bash
cd "c:/project-destination"
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies
```bash
cd ..\backend
npm install
```
backend
npm run dev
```
```bash
cd frontend
npm run web
```
App will be available on `http://localhost:8081`

### Or run on specific platforms:
```bash
# iOS (macOS only)
npm run ios

# Android
npm run android

# Web
npm run web

# Start Expo CLI
npm start
```bash
npm run lint          # Run ESLint
npm run type-check    # Type checking
```

### Backend
```bash
npm run build         # Compile TypeScript
npm run dev           # Run with hot reload
npm run lint          # Run ESLint
npm run type-check    # Type checking
```

## Git Workflow

```bash
# Initial commit
```bash

Currently available:
- `GET /api` - Welcome message
- `GET /api/health` - Health check

## Tech Stack

**Frontend:**
- React Native / Expo
- TypeScript
- Axios (HTTP client)

**Backend:**
- Node.js
- Express.js
- TypeScript
- CORS enabled

## Next Steps

1. Set up database (MongoDB, PostgreSQL, etc.)
2. Add authentication (JWT, OAuth, etc.)
3. Create course management endpoints
4. Build student management UI
5. Add assignment tracking features
Tech Stack

- React Native / Expo
- TypeScript
- Axios (HTTP client)

## Next Steps

1. Expand landing page with navigation
2. Create course management screens
3. Build student management UI
4. Add assignment tracking features
5. Integrate with backend API (when ready)
=======
# ug_mk_4



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://git.las.iastate.edu/SeniorDesignComS/2026spr/402c/ug_mk_4.git
git branch -M main
git push -uf origin main
```
