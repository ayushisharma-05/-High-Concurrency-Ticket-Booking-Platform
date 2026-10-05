# 🎫 EventHub — High-Concurrency Ticket Booking Platform

A production-grade MERN stack event-ticketing platform with real-time seat locking, concurrency-safe bookings, payment simulation, and an admin dashboard.

---

## 📦 How to Run the Project

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally (or MongoDB Atlas URI)

### Quick Start
```bash
# 1. Install all dependencies (root + server + ui)
npm run install-all

# 2. Copy environment config
cp .env.example server/.env
# Edit server/.env with your MongoDB URI & JWT secret

# 3. Seed the database with demo data (12 events, 37 bookings, 4 users)
npm --prefix server run seed

# 4. Start both server & frontend concurrently
npm run dev
```

### Docker (Alternative)
```bash
docker-compose up --build
```

### Test Credentials (After Seeding)
| Role  | Email               | Password     |
|-------|---------------------|--------------|
| ADMIN | admin@eventhub.com  | password123  |
| USER  | john@example.com    | password123  |
| USER  | jane@example.com    | password123  |

---

## 🔐 Environment Variables

File: `server/.env`

| Variable              | Description                        | Default                                     |
|-----------------------|------------------------------------|----------------------------------------------|
| `PORT`                | Server port                        | `5000`                                       |
| `MONGO_URI`           | MongoDB connection string          | `mongodb://localhost:27017/ticket-booking`    |
| `JWT_SECRET`          | Secret key for JWT signing         | *(must be set — not committed to repo)*      |
| `LOCK_DURATION_MINUTES` | Seat lock expiry in minutes      | `5`                                          |

> ⚠️ **Security**: `.env` is in `.gitignore`. Only `.env.example` is committed (no real secrets).

---

## 🏗️ Architecture

```
project/
├── server/                    # Backend (Node.js + Express)
│   ├── config/db.js           # MongoDB connection
│   ├── middleware/auth.js     # JWT verification + role guard
│   ├── models/
│   │   ├── User.js            # User schema (bcrypt hashing)
│   │   ├── Event.js           # Event + embedded Seat sub-docs
│   │   └── Booking.js         # Booking with auto ticket-number
│   ├── routes/
│   │   ├── auth.js            # POST /register, /login
│   │   ├── events.js          # CRUD for events (admin-only write)
│   │   ├── seats.js           # GET seats, POST lock (atomic)
│   │   ├── bookings.js        # Booking lifecycle + payment sim
│   │   └── dashboard.js       # Admin aggregation stats
│   ├── tests/
│   │   ├── unit.test.js       # Model-level business logic tests
│   │   ├── integration.test.js# Full API + DB integration tests
│   │   └── concurrency.test.js# 100-request concurrent lock test
│   ├── seed.js                # Database seeder script
│   └── server.js              # Express + Socket.IO + lock cleanup
├── ui/                        # Frontend (React + Vite)
│   ├── src/
│   │   ├── context/           # AuthContext (JWT state management)
│   │   ├── components/        # Navbar, SeatMap, ProtectedRoute
│   │   └── pages/             # Landing, Events, EventDetail, Bookings, Dashboard
│   └── public/images/         # Event banner images
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

### Design Principles
- **Separation of Concerns**: Routes handle HTTP, models handle data, middleware handles auth.
- **Business logic in backend**: All validation, state transitions, and price calculations happen server-side.
- **Modular routing**: Each resource has its own route file.
- **Context-based state**: Frontend uses React Context (not prop-drilling) for auth state.

---

## 🗄️ Database Design

### Collections & Schemas

**Users**
| Field    | Type   | Constraints              |
|----------|--------|--------------------------|
| name     | String | required                 |
| email    | String | required, unique, indexed|
| password | String | bcrypt hashed            |
| role     | Enum   | USER \| ADMIN            |

**Events**
| Field       | Type     | Notes                        |
|-------------|----------|------------------------------|
| title       | String   | required                     |
| description | String   |                              |
| date        | Date     | required                     |
| venue       | String   | required                     |
| isPublished | Boolean  | default: false               |
| seats       | [Seat]   | Embedded sub-document array  |
| createdBy   | ObjectId | ref: User                    |

**Seats (Embedded in Event)**
| Field    | Type     | Notes                                  |
|----------|----------|----------------------------------------|
| seatId   | String   | e.g. "A1" (unique within event)        |
| row      | String   | Row identifier                         |
| number   | Number   | Seat number within row                 |
| price    | Number   | Individual seat price                  |
| status   | Enum     | AVAILABLE \| LOCKED \| BOOKED          |
| lockedBy | ObjectId | Who locked it                          |
| lockedAt | Date     | When locked (for expiry calculation)   |

**Bookings**
| Field         | Type     | Notes                                |
|---------------|----------|--------------------------------------|
| user          | ObjectId | ref: User                            |
| event         | ObjectId | ref: Event                           |
| seats         | [String] | Array of seatIds                     |
| totalAmount   | Number   | Sum of seat prices                   |
| status        | Enum     | PENDING \| CONFIRMED \| CANCELLED \| FAILED |
| paymentStatus | Enum     | PENDING \| SUCCESS \| FAILED         |
| ticketNumber  | String   | Auto-generated (TKT-xxx), unique     |

### Indexing Strategy
- `User.email` — **unique index** for fast login lookups and duplicate prevention.
- `Booking.ticketNumber` — **unique sparse index** for ticket lookups.
- `Event._id` + `seats.seatId` — used in `$elemMatch` atomic queries for O(1) seat locking.
- All `ObjectId` references — automatically indexed by MongoDB.

---

## 🔒 Concurrency Strategy

### Problem
If 100 users try to book the same seat simultaneously, only 1 must succeed.

### Solution: MongoDB Atomic `findOneAndUpdate`

```js
Event.findOneAndUpdate(
  {
    _id: eventId,
    seats: {
      $elemMatch: {
        seatId: seatId,
        $or: [
          { status: 'AVAILABLE' },
          { status: 'LOCKED', lockedAt: { $lt: expiryCutoff } }
        ]
      }
    }
  },
  { $set: { 'seats.$.status': 'LOCKED', 'seats.$.lockedBy': userId } },
  { new: true }
)
```

**Why this works**: MongoDB guarantees document-level atomicity. The `$elemMatch` filter ensures only ONE request can match `status: 'AVAILABLE'`. After the first write changes it to `LOCKED`, all subsequent concurrent requests find no match and return `null` → `409 Conflict`.

### Lock Expiry
- Seats auto-expire after `LOCK_DURATION_MINUTES` (default: 5 min).
- A server-side `setInterval` (every 30s) scans for expired locks and releases them.
- Expired locks are also checked on-demand when seats are fetched.

### Automated Proof
Run `npm run test:concurrency` — fires 100 simultaneous requests; asserts exactly 1 succeeds.

---

## 🛡️ Security Considerations

| Concern               | Implementation                                        |
|------------------------|-------------------------------------------------------|
| Password Storage       | bcrypt with salt rounds=10                            |
| Auth Tokens            | JWT with 7-day expiry, verified on every protected route |
| Role-Based Access      | `adminOnly` middleware blocks non-ADMIN users          |
| Secrets                | `.env` + `.gitignore` — never committed               |
| Input Validation       | Mongoose schema validation + route-level checks       |
| CORS                   | Restricted to frontend origin                         |
| Atomic Operations      | Prevents race conditions at the database level        |

---

## 🌐 API Documentation

### Auth
| Method | Endpoint             | Auth | Description          |
|--------|----------------------|------|----------------------|
| POST   | /api/auth/register   | No   | Create user account  |
| POST   | /api/auth/login      | No   | Get JWT token        |

### Events
| Method | Endpoint             | Auth   | Description           |
|--------|----------------------|--------|-----------------------|
| GET    | /api/events          | JWT    | List events           |
| POST   | /api/events          | Admin  | Create event          |
| GET    | /api/events/:id      | JWT    | Get event details     |
| PUT    | /api/events/:id      | Admin  | Update event          |
| DELETE | /api/events/:id      | Admin  | Delete event          |

### Seats
| Method | Endpoint                | Auth | Description                |
|--------|-------------------------|------|----------------------------|
| GET    | /api/events/:id/seats   | JWT  | Get seat map (cleans expired locks) |
| POST   | /api/seats/lock         | JWT  | Atomic seat locking        |

### Bookings
| Method | Endpoint                      | Auth | Description                     |
|--------|-------------------------------|------|---------------------------------|
| GET    | /api/bookings                 | JWT  | List user's bookings            |
| GET    | /api/bookings/:id             | JWT  | Get booking detail              |
| POST   | /api/bookings                 | JWT  | Create booking from locked seats|
| POST   | /api/bookings/:id/payment     | JWT  | Simulate payment                |
| POST   | /api/bookings/:id/cancel      | JWT  | Cancel & release seats          |

### Dashboard
| Method | Endpoint        | Auth  | Description         |
|--------|-----------------|-------|---------------------|
| GET    | /api/dashboard  | Admin | Aggregated stats    |

---

## 🧪 Testing Strategy

### Test Types
| Type          | File                       | Needs Server? | What it tests                          |
|---------------|----------------------------|---------------|----------------------------------------|
| Unit          | `tests/unit.test.js`       | No (DB only)  | Password hashing, role defaults, state transitions, price calculations |
| Integration   | `tests/integration.test.js`| Yes           | Full API flow: auth → create → lock → book → pay → cancel |
| Concurrency   | `tests/concurrency.test.js`| Yes           | 100 simultaneous lock requests         |

### Edge Cases Covered
- Invalid authentication (wrong password, non-existent user)
- Unauthorized access (no token, invalid token, garbage token)
- Role-based access (user trying admin actions)
- Duplicate registration
- Missing required fields
- Non-existent resource (404)
- Double-locking same seat
- Booking seats locked by another user
- Double-paying confirmed booking
- Payment failure → seat release verification
- Cancellation → seat release verification
- Unauthorized cancellation

### Running Tests
```bash
# All tests
npm --prefix server test

# Individual suites
npm --prefix server run test:unit
npm --prefix server run test:integration
npm --prefix server run test:concurrency
```

---

## ⚠️ Known Limitations

1. **Lock cleanup via `setInterval`**: Works for single-server deployment. For horizontal scaling across multiple instances, should use a distributed job queue (e.g., BullMQ + Redis).
2. **Simplified event editing**: Editing seat layout of a live event with active bookings is not supported — requires event deletion and recreation.
3. **No refresh token rotation**: JWT has a 7-day expiry with no refresh mechanism.
4. **Payment is simulated**: No real payment gateway integration. The QR code is visual-only.
5. **No rate limiting**: API endpoints are not rate-limited against brute-force attacks.

---

## 🚀 What I Would Improve With 2 More Days

1. **Redis-backed seat locking** — Replace MongoDB polling with Redis pub/sub for sub-millisecond lock propagation and distributed lock cleanup across multiple server instances.
2. **Refresh token rotation** — Implement secure HttpOnly cookie-based refresh tokens with automatic rotation.
3. **Rate limiting** — Add `express-rate-limit` to auth endpoints to prevent brute-force attacks.
4. **Razorpay/Stripe integration** — Replace mock payment with a real payment gateway sandbox.
5. **Email notifications** — Send booking confirmation and cancellation emails via Nodemailer.
6. **Pagination & search** — Add cursor-based pagination for events and bookings lists.
7. **Comprehensive error boundary** — Add React Error Boundary components for graceful frontend crash recovery.
8. **CI/CD pipeline** — GitHub Actions workflow to run tests automatically on push.

---

## 🏃 Real-Time Features

- **Socket.IO** rooms per event (`event-{id}`).
- When any user locks, books, or cancels seats → server emits `seatsUpdated` to all connected clients in that room.
- Frontend listens and instantly re-renders the seat map — **zero polling, zero page refresh**.
