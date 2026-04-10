# Semsem

A full-stack mobile social platform for pet owners and lovers. Users can post about pet adoptions, lost/found animals, mating requests, and general pet content — while also chatting with other users in real time and discovering pets nearby.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Mobile Setup](#mobile-setup)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)

---

## Overview

Semsem is a monorepo containing two applications:

| App | Path | Description |
|-----|------|-------------|
| **Backend** | `backend/` | Node.js / Express REST API backed by MongoDB |
| **Mobile** | `mobile/` | Expo / React Native client (iOS, Android, Web) |

---

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** MongoDB via Mongoose 9
- **Auth:** JSON Web Tokens (`jsonwebtoken`) + password hashing (`bcryptjs`)
- **Other:** `cors`, `dotenv`

### Mobile
- **Framework:** Expo ~54 with New Architecture enabled
- **Routing:** Expo Router ~6 (file-based)
- **UI:** React Native 0.81 / React 19
- **HTTP:** Axios
- **Storage:** `@react-native-async-storage/async-storage`
- **Real-time:** `socket.io-client`
- **Media:** `expo-image-picker`
- **Icons:** `@expo/vector-icons`

---

## Project Structure

```
Semsem/
├── backend/
│   └── src/
│       ├── server.js              # Entry point — boots Express, connects DB
│       ├── index.js               # App factory — CORS, JSON, routes, error middleware
│       ├── config/
│       │   └── db.js              # Mongoose connection
│       ├── routes/                # auth, users, pets, posts, comments,
│       │                          # likes, messages, conversations, notifications
│       ├── controllers/           # Business logic (one file per domain)
│       ├── models/                # Mongoose schemas
│       │   ├── User.js
│       │   ├── Pet.js
│       │   ├── Post.js
│       │   ├── Comment.js
│       │   ├── Like.js
│       │   ├── Message.js
│       │   ├── Conversation.js
│       │   └── Notification.js
│       ├── middlewares/           # authMiddleware, validateMiddleware, errorMiddleware
│       └── services/
│           └── notificationService.js
│
└── mobile/
    ├── app/
    │   ├── index.jsx              # Root screen
    │   ├── _layout.jsx            # Root layout
    │   ├── (auth)/                # Login & Register screens
    │   └── (app)/                 # Authenticated tab app
    │       ├── home/              # Main feed
    │       ├── meet/              # Pet discovery / "Meet" section
    │       ├── messages/          # Conversations list + [conversationId] chat
    │       ├── profile/           # User profile
    │       ├── myposts/           # User's own posts
    │       ├── mypets/            # User's own pets
    │       ├── post/[id]/         # Single post detail
    │       └── pet/[id]/          # Single pet detail
    ├── components/                # Shared UI (ThemedButton, PostCard, MeetGrid, …)
    ├── contexts/                  # UserContext, LocationFilterContext
    ├── hooks/                     # useUser
    ├── services/                  # api.js, authService, postService, petService,
    │                              # socketService, notificationEvents, …
    └── constants/                 # Colors, countries
```

---

## Features

- **Authentication** — Register/login with JWT-protected routes; guest and authenticated-only route guards.
- **Posts & Feed** — Create, browse, and filter posts by type: `adoption`, `lost`, `found`, `mating`, or `general`. Supports images and pet metadata.
- **Pets** — Full CRUD for a user's pet profiles with breed, type, and photo support.
- **Social** — Comment on and like posts.
- **Messaging** — Private conversations between users with a real-time-ready chat screen.
- **Notifications** — In-app notification sheet with unread counts and mark-as-read.
- **Discovery ("Meet")** — Browse pets by location with a shared location filter across screens.
- **Location Filtering** — Filter content by country and city through a global context.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A running MongoDB instance (local or Atlas)
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (see [Environment Variables](#environment-variables)), then:

```bash
# Development (auto-restarts with nodemon)
npm run dev

# Production
npm start
```

The server listens on the port defined in your `.env` (default `5000`).

### Mobile Setup

```bash
cd mobile
npm install
```

Update the API base URL in `mobile/services/api.js` to point to your running backend, then:

```bash
# Start Expo development server
npx expo start

# Target a specific platform
npx expo start --android
npx expo start --ios
npx expo start --web
```

---

## Environment Variables

Create `backend/.env` with the following keys:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `PORT` | Port the server listens on (default `5000`) |

---

## API Overview

All routes are prefixed with `/api`.

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Register, login |
| `/api/users` | User profiles |
| `/api/pets` | Pet CRUD |
| `/api/posts` | Post CRUD + filtering |
| `/api/comments` | Comments on posts |
| `/api/likes` | Like/unlike posts |
| `/api/messages` | Individual messages |
| `/api/conversations` | Conversation threads |
| `/api/notifications` | Notification list + mark-read |

Protected routes require a `Bearer <token>` header supplied by the mobile client after login.
