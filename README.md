# Campus Safety Backend API

Backend API for the Campus Safety mobile/web application.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Redis (optional, for background jobs)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file (use `.env.example` as template):

```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - MongoDB connection string
   - JWT secret
   - AWS S3 credentials (if using file uploads)
   - Firebase FCM credentials (if using push notifications)
   - Mapbox token (if using maps)

### Development

```bash
# Start development server with hot reload
npm run dev

# Seed database with test data
node src/seed.js
```

## 📦 Test Credentials

After running the seed script, you can use these credentials:

**Campus Code**: `TEST-U`

**Admin**:

- Email: `admin@test-university.edu`
- Password: `Admin@123456`

**Moderator**:

- Email: `moderator@test-university.edu`
- Password: `Mod@123456`

**Student**:

- Email: `student@test-university.edu`
- Password: `Student@123456`

## 📍 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot` - Request password reset
- `POST /auth/reset` - Reset password
- `POST /auth/verify-email` - Verify email
- `GET /auth/me` - Get current user

### Reports

- `GET /reports/nearby` - Get nearby reports (geospatial)
- `GET /reports/:id` - Get single report
- `POST /reports` - Create report
- `PATCH /reports/:id` - Update report (time-limited)
- `DELETE /reports/:id` - Delete/retract report
- `POST /reports/:id/vote` - Vote on report (confirm/dispute)
- `POST /reports/:id/comment` - Add comment
- `GET /reports/:id/comments` - Get report comments
- `POST /reports/:id/report-spam` - Report as spam

### Users

- `GET /users/:id` - Get user profile
- `PATCH /users/:id` - Update profile
- `POST /users/:id/change-password` - Change password
- `GET /users/:id/reports` - Get user's reports
- `GET /users/:id/notifications` - Get notifications
- `PATCH /users/:id/notifications/:notifId/read` - Mark as read
- `POST /users/:id/notifications/read-all` - Mark all as read

### Devices (Push Notifications)

- `POST /users/devices/register` - Register device token
- `DELETE /users/devices/:deviceId` - Unregister device

### Uploads

- `POST /uploads/signed-url` - Get S3 signed URL for upload
- `DELETE /uploads/:key` - Delete file from S3

## 🔒 Authentication

All protected routes require JWT token in Authorization header:

```
Authorization: Bearer <access_token>
```

## 🗺️ Geospatial Queries

The reports API uses MongoDB geospatial queries (2dsphere index) for efficient nearby search:

```javascript
GET /reports/nearby?lat=37.7749&lon=-122.4194&radius=1000&category=safety&severity=4
```

Parameters:

- `lat` - Latitude (required)
- `lon` - Longitude (required)
- `radius` - Search radius in meters (default: 1000, max: 10000)
- `category` - Filter by category
- `severity` - Minimum severity (1-5)
- `status` - Filter by status
- `since` - Filter by creation date
- `limit` - Max results (default: 100, max: 500)

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/          # Environment configuration
│   ├── controllers/     # Route controllers
│   ├── db/
│   │   └── schemas/     # Mongoose models
│   ├── middlewares/     # Custom middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── app.js           # Express app setup
│   └── seed.js          # Database seeding script
├── index.js             # Server entry point
└── package.json
```

## 🛠️ Technologies

- **Express.js** - Web framework
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Joi** - Validation
- **AWS SDK** - S3 file uploads
- **Socket.io** - Real-time features (TODO)
- **Bull** - Background jobs (TODO)

## 📝 TODO

- [ ] Implement Socket.io for real-time updates
- [ ] Add FCM push notifications
- [ ] Implement background job processing
- [ ] Add moderation endpoints
- [ ] Add admin endpoints
- [ ] Add public landing endpoints
- [ ] Add rate limiting
- [ ] Add API documentation (Swagger)
- [ ] Add comprehensive tests

## 🐛 Known Issues

- Duplicate index warnings (harmless, can be fixed by removing redundant index definitions)
- AWS SDK v2 maintenance mode (should migrate to v3 for production)

## 📄 License

MIT
