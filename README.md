# Location & Address Management – Backend

Production-ready Location & Address module for a MERN E-commerce app.  
Mirrors the flow used by **Blinkit**, **Zepto**, and **Swiggy Instamart**.

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Runtime      | Node.js ≥ 18                      |
| Framework    | Express.js                        |
| Database     | MongoDB + Mongoose                |
| Auth         | JWT (Bearer token)                |
| Geocoding    | Google Maps Geocoding API         |
| Logging      | Winston                           |
| Validation   | express-validator                 |
| Security     | Helmet, CORS, express-rate-limit  |

---

## Folder Structure

```
back-end/
├── server.js                      # Entry point
├── .env                           # Environment variables (do NOT commit)
├── .env.example                   # Safe template to commit
├── postman/
│   └── Location_Address_API.postman_collection.json
└── src/
    ├── app.js                     # Express app setup
    ├── config/
    │   └── database.js            # MongoDB connection
    ├── controllers/
    │   ├── address.controller.js  # All 7 address APIs
    │   └── auth.controller.js     # Register / Login / Me
    ├── middleware/
    │   ├── auth.middleware.js     # JWT protect middleware
    │   ├── errorHandler.middleware.js
    │   └── validate.middleware.js
    ├── models/
    │   ├── Address.model.js
    │   └── User.model.js
    ├── routes/
    │   ├── address.routes.js
    │   └── auth.routes.js
    ├── services/
    │   └── googleMaps.service.js  # reverseGeocode()
    ├── utils/
    │   ├── AppError.js            # Custom error class
    │   ├── asyncHandler.js        # Async wrapper
    │   ├── apiResponse.js         # Standardised responses
    │   ├── geoUtils.js            # Haversine distance
    │   └── logger.js              # Winston logger
    └── validations/
        ├── address.validation.js
        └── auth.validation.js
```

---

## Quick Start

### 1. Install dependencies
```bash
cd back-end
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` and fill in:
```
MONGO_URI=mongodb://localhost:27017/location_ecommerce
JWT_SECRET=your_very_long_random_secret
GOOGLE_MAPS_API_KEY=your_key_from_google_cloud_console
```

### 3. Get a Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Geocoding API**
3. Create credentials → API Key
4. (Recommended) Restrict key to your server's IP

### 4. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`

---

## Environment Variables

| Variable              | Required | Description                              |
|-----------------------|----------|------------------------------------------|
| `NODE_ENV`            | Yes      | `development` or `production`            |
| `PORT`                | No       | Server port (default: 5000)              |
| `MONGO_URI`           | Yes      | MongoDB connection string                |
| `JWT_SECRET`          | Yes      | Long random string for signing JWTs      |
| `JWT_EXPIRES_IN`      | No       | JWT expiry (default: `7d`)               |
| `GOOGLE_MAPS_API_KEY` | Yes      | Google Geocoding API key                 |
| `ALLOWED_ORIGINS`     | No       | Comma-separated CORS origins             |
| `RATE_LIMIT_WINDOW_MS`| No       | Rate limit window in ms (default: 15min) |
| `RATE_LIMIT_MAX`      | No       | Max requests per window (default: 100)   |

---

## API Reference

All address routes require: `Authorization: Bearer <token>`

### Auth

| Method | Endpoint             | Description        |
|--------|----------------------|--------------------|
| POST   | `/api/auth/register` | Register a user    |
| POST   | `/api/auth/login`    | Login, get token   |
| GET    | `/api/auth/me`       | Get current user   |

### Address

| Method | Endpoint                       | Description                         |
|--------|--------------------------------|-------------------------------------|
| POST   | `/api/address/current-location`| Save GPS location (reverse geocode) |
| GET    | `/api/address/default`         | Get default address                 |
| GET    | `/api/address`                 | Get all addresses (paginated)       |
| POST   | `/api/address`                 | Create address manually             |
| PUT    | `/api/address/:id`             | Update address                      |
| DELETE | `/api/address/:id`             | Delete address                      |
| PATCH  | `/api/address/default/:id`     | Set an address as default           |

---

## Frontend Integration Guide

### Step 1 – Request location permission
```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    saveCurrentLocation(latitude, longitude);
  },
  (error) => {
    console.error('Location denied:', error.message);
    // Show manual address entry form
  },
  { enableHighAccuracy: true, timeout: 10000 }
);
```

### Step 2 – Call save current location API
```javascript
const saveCurrentLocation = async (latitude, longitude) => {
  try {
    const response = await fetch('/api/address/current-location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ latitude, longitude }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('Location saved:', data.data);
      // Update UI with address
    }
  } catch (err) {
    console.error('Failed to save location:', err);
  }
};
```

### Step 3 – Fetch default address on app load
```javascript
const getDefaultAddress = async () => {
  const response = await fetch('/api/address/default', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
  });
  const data = await response.json();
  return data.success ? data.data : null;
};
```

### Step 4 – Get all saved addresses
```javascript
const getAllAddresses = async (page = 1, limit = 10) => {
  const response = await fetch(`/api/address?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
  });
  return response.json();
};
```

### Step 5 – Set an address as default
```javascript
const setDefault = async (addressId) => {
  const response = await fetch(`/api/address/default/${addressId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
  });
  return response.json();
};
```

---

## Standardised Response Format

### Success
```json
{
  "success": true,
  "message": "Human readable message",
  "data": { ... },
  "meta": { "total": 10, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### Error
```json
{
  "success": false,
  "message": "What went wrong",
  "code": "MACHINE_READABLE_CODE",
  "errors": [
    { "field": "latitude", "message": "Latitude is required." }
  ]
}
```

### Error Codes

| Code                       | HTTP | Meaning                             |
|----------------------------|------|-------------------------------------|
| `NO_TOKEN`                 | 401  | No Authorization header             |
| `INVALID_TOKEN`            | 401  | Token is malformed / invalid        |
| `TOKEN_EXPIRED`            | 401  | JWT has expired                     |
| `VALIDATION_ERROR`         | 400  | Request body/params failed          |
| `ADDRESS_NOT_FOUND`        | 404  | Address doesn't exist or wrong user |
| `DEFAULT_ADDRESS_NOT_FOUND`| 404  | User has no default address         |
| `DUPLICATE_ADDRESS`        | 409  | Address within 50m already exists   |
| `GOOGLE_API_TIMEOUT`       | 503  | Google Maps API timed out           |
| `GOOGLE_API_DENIED`        | 503  | Google API key invalid/restricted   |
| `GEOCODE_NO_RESULTS`       | 404  | No address at those coordinates     |
| `INVALID_ID`               | 400  | MongoDB ObjectId is malformed       |

---

## Postman Collection

Import `postman/Location_Address_API.postman_collection.json` into Postman.

The collection:
- Auto-saves the JWT token after Register/Login
- Auto-saves addressId after create calls
- Includes sample responses for every endpoint
- Covers happy paths and all error cases

---

## Key Design Decisions

**1. Duplicate prevention (50m radius)**  
Uses the Haversine formula to check if any existing address is within 50 metres. Returns the existing address instead of creating a duplicate.

**2. One default per user**  
Enforced at two levels:
- Pre-save Mongoose hook clears all others when `isDefault: true`
- Compound index `{ user, isDefault }` for fast lookup

**3. Deleted default → auto-promote**  
When a default address is deleted, the most recently created remaining address is automatically promoted to default.

**4. Google API failure handling**  
All Google API errors are caught and mapped to human-friendly `AppError` messages with distinct error codes. The API never leaks raw Google error messages to the client.

**5. Centralised error handling**  
Single `globalErrorHandler` middleware maps Mongoose errors (CastError, ValidationError, duplicate key) and JWT errors to proper HTTP responses. Dev mode includes stack traces; production hides them.
