# LifeFlow - Blood Donation API

A RESTful API backend for a comprehensive blood donation platform that connects donors, volunteers, and those in need of blood.

## Description

LifeFlow API provides a complete backend solution for blood donation operations. It handles user authentication, robust Role-Based Access Control (RBAC), blood request management, and volunteer responses using MongoDB as the database.

## Live Link

> Explore the LifeFlow API:
>
> **🌐 https://lifeflow-server.vercel.app**

## Tech Stack

- Node.js
- Express.js
- MongoDB
- JWT (JSON Web Tokens)
- JOSE (JWT verification)
- Stripe (Payment integration)
- CORS

## Features

### Authentication & Role-Based Access Control (RBAC)
- **JWT-based authentication** using the `jose` library for secure token verification.
- **Strict Role-Based Access Control (RBAC):** The API enforces authorization using custom middleware (`verifyRole`). Users are assigned specific roles (`admin`, `donor`, `volunteer`), which restrict access to relevant endpoints and operations:
  - **Admin:** Full access to manage all users and blood requests across the platform.
  - **Donor:** Can create, read, update, and delete their own blood requests.
  - **Volunteer:** Can view all requests, respond to emergencies, create requests, and update the status of requests they are handling.
- Protected routes to ensure data privacy for authorized users only.

### Blood Request Management
- Create new blood requests (Donors & Volunteers)
- Browse all available pending requests (Public)
- Search requests by blood type, urgency, and location
- Update request information (Donors & Volunteers for their own requests)
- Delete requests (Donors & Volunteers for their own requests)
- Integrated Stripe endpoints for secure donations

### Volunteer System
- Respond to emergency blood requests
- Track the number of responses on each request
- Manage personal volunteer profiles and requests

### Admin Operations
- Comprehensive user management (view, update roles/status, delete)
- Global management of all blood requests
- Access to detailed user profiles

## API Endpoints

### Public Endpoints
- `GET /` - API health check
- `GET /requests` - Get all pending blood requests (supports search, bloodType, and urgency filters)
- `GET /requests/:requestId` - Get specific request details

### Protected Endpoints (Require Authentication)

#### Admin Operations (`admin` role)
- `GET /admin/users` - Get all users
- `GET /admin/users/:userId` - Get specific user profile
- `PATCH /admin/users/:userId` - Update user role and status
- `DELETE /admin/users/:userId` - Delete a user
- `GET /admin/requests` - Get all blood requests
- `PATCH /admin/requests/:requestId` - Update any blood request
- `DELETE /admin/requests/:requestId` - Delete any blood request
- `GET /admin/profile/:userId` - Get admin profile

#### Donor Operations (`donor` role)
- `POST /donor/requests` - Create a new blood request
- `GET /donor/my-requests/:userId` - Get donor's own requests
- `PATCH /donor/requests/:requestId` - Update donor's own request
- `DELETE /donor/requests/:requestId` - Delete donor's own request
- `GET /donor/profile/:userId` - Get donor profile
- `PATCH /donor/profile/:userId` - Update donor profile

#### Volunteer Operations (`volunteer` role)
- `POST /volunteer/requests` - Create a new blood request
- `GET /volunteer/my-requests/:userId` - Get volunteer's own requests
- `GET /volunteer/requests` - View available blood requests
- `PATCH /volunteer/requests/:requestId` - Update volunteer's own request
- `DELETE /volunteer/requests/:requestId` - Delete volunteer's own request
- `POST /volunteer/respond/:requestId` - Respond to a blood request
- `PATCH /volunteer/update-status/:requestId` - Update a request's status
- `GET /volunteer/profile/:userId` - Get volunteer profile
- `PATCH /volunteer/profile/:userId` - Update volunteer profile

## Environment Variables

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with required environment variables
4. Start the server:
   ```bash
   npm start
   ```
   For development:
   ```bash
   npm run dev
   ```

## Database Schema

### Users Collection
- User details (name, email, status)
- Role (`admin`, `donor`, `volunteer`)
- Timestamps

### BloodRequests Collection
- Patient and hospital information
- Blood type, urgency, location
- Requester reference (Donor/Volunteer IDs)
- Status
- Response count
- Timestamps

### Responses Collection
- Volunteer information
- Request reference
- Message
- Timestamps

## Security Features

- JWT token verification (`jose`)
- Role-Based Access Control (RBAC) authorization checks
- Owner-only access for request modifications
- Protected routes middleware
- CORS configuration for allowed origins

## Deployment

The API is deployed on Vercel and can be accessed at:
```
https://lifeflow-server.vercel.app
```

## Contact

For questions or support, contact: farhadnuri559@gmail.com
