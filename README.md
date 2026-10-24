# Semsem

Semsem is a full-stack community and service platform for pet owners, animal
professionals, shelters, associations, breeders, and pet businesses. The
repository contains an Expo mobile application, an Express API, and a React
administration dashboard.

## Applications

| Application | Directory | Description |
| --- | --- | --- |
| Backend API | `backend/` | Express, MongoDB, Mongoose, JWT, Socket.IO, and Cloudinary |
| Mobile app | `mobile/` | Expo and React Native application for iOS, Android, and web |
| Admin dashboard | `web/` | Vite and React dashboard for administration and moderation |

## Main Features

### Mobile

- JWT registration and login with guest and authenticated route protection.
- User profiles for pet owners and service providers.
- Post feed with Question, Adoption, Lost, Found, Mating, and Sale filters.
- Post creation and editing with zero to five optional pictures.
- Sale posts with a price and selectable currency, displayed on feed cards.
- Pet profiles, care records, and QR care-record views.
- Likes, comments, private conversations, and real-time messaging support.
- Notifications with unread counts and links to related content.
- Appointments with creation, rescheduling, acceptance, rejection, and
  cancellation workflows.
- Activity history for the current user's likes, comments, and appointment
  actions.
- Location filtering by country, city, or nearby results.
- Bottom navigation in this order: Notifications, Messages, Home, Activity,
  and My Space.

### Administration

- Dashboard and usage analytics.
- User, pet, post, appointment, and report management.
- Account and content moderation statuses.
- Post interaction details and report review.

## Tech Stack

### Backend

- Node.js and Express 5
- MongoDB and Mongoose 9
- JWT authentication and bcrypt password hashing
- Socket.IO
- Cloudinary and Multer

### Mobile

- Expo 54 and Expo Router 6
- React 19 and React Native 0.81
- Axios and AsyncStorage
- Expo Image Picker and Expo Location
- Socket.IO client

### Admin Web

- Vite 6 and React 19
- Recharts
- Lucide React icons

## Project Structure

```text
Semsem/
|-- backend/
|   |-- scripts/             # Administrative scripts
|   `-- src/
|       |-- config/          # Database, environment, and Cloudinary setup
|       |-- constants/       # Profile, post, and moderation values
|       |-- controllers/     # API business logic
|       |-- middlewares/     # Authentication, admin, upload, and errors
|       |-- models/          # Mongoose models
|       |-- routes/          # REST routes
|       |-- services/        # Shared backend services
|       |-- validations/     # Request validation
|       |-- index.js         # Express application
|       `-- server.js        # HTTP and Socket.IO server entry point
|-- mobile/
|   |-- app/                 # Expo Router screens and layouts
|   |-- components/          # Shared React Native components
|   |-- constants/           # Post types, currencies, locations, and colors
|   |-- contexts/            # User and location state
|   `-- services/            # API, auth, post, pet, message, and activity data
|-- web/
|   |-- public/              # Static assets
|   `-- src/                 # Admin dashboard application
|-- .gitignore
`-- README.md
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- MongoDB, either local or MongoDB Atlas
- A Cloudinary account when image uploads are required
- Expo Go or a native simulator for mobile testing

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/semsem
JWT_SECRET=replace-with-a-secure-secret
JWT_EXPIRES_IN=7d
PORT=5000

# Use CLOUDINARY_URL, or provide the three separate values below.
CLOUDINARY_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Start the API:

```bash
npm run dev
```

Create or update an administrator account:

```bash
npm run create-admin -- "admin@example.com" "strong-password" "Admin Name"
```

### 2. Mobile

```bash
cd mobile
npm install
```

Optionally create `mobile/.env` to override automatic local API discovery:

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000
```

Start Expo:

```bash
npm start
```

Other available commands are `npm run android`, `npm run ios`, and
`npm run web`.

### 3. Admin Dashboard

```bash
cd web
npm install
```

Optionally create `web/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Start the dashboard:

```bash
npm run dev
```

The Vite development server uses `http://localhost:5173` by default.

## API Overview

All API routes are prefixed with `/api`.

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | Registration and login |
| `/api/users` | Profiles and provider reviews |
| `/api/pets` | Pet profiles and care records |
| `/api/posts` | Posts, filters, and reports |
| `/api/comments` | Post comments and current-user comment history |
| `/api/likes` | Likes and current-user like history |
| `/api/messages` | Messages and conversation creation |
| `/api/conversations` | Conversation lists and details |
| `/api/notifications` | Notifications and unread state |
| `/api/appointments` | Appointment creation and updates |
| `/api/locations` | Location suggestions |
| `/api/admin` | Protected administration endpoints |

Protected endpoints require an `Authorization: Bearer <token>` header.

## Local Files

Environment files, dependencies, build output, logs, and the repository-level
`tmp/` directory are ignored by Git. Files placed in `tmp/` will not be
included when pushing the repository to GitHub.
