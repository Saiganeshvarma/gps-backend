# Location & Address Management API

> Mimics the Blinkit / Zepto / Swiggy Instamart location + address management flow.

**Base URL:** `http://localhost:5000`  
**Authentication:** JWT Bearer token  
**Rate Limit:** 100 requests per 15 minutes per IP

---

## Table of Contents

- [Authentication](#authentication)
  - [Register](#1-register)
  - [Login](#2-login)
  - [Get Current User](#3-get-current-user)
- [Address](#address)
  - [Save Current Location](#4-save-current-location)
  - [Reverse Geocode Preview](#5-reverse-geocode-preview)
  - [Get Default Address](#6-get-default-address)
  - [Get All Addresses](#7-get-all-addresses)
  - [Create Address](#8-create-address)
  - [Update Address](#9-update-address)
  - [Delete Address](#10-delete-address)
  - [Set Default Address](#11-set-default-address)
- [Health Check](#health-check)
- [Error Reference](#error-reference)

---

## Authentication

All address endpoints require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <token>
```

Tokens are returned on successful registration or login, and expire after **7 days** by default.

---

## Authentication Endpoints

### 1. Register

Creates a new user account and returns a JWT.

**`POST /api/auth/register`**

#### Request Body

| Field      | Type   | Required | Constraints                  |
|------------|--------|----------|------------------------------|
| `name`     | string | Yes      | Max 60 characters            |
| `email`    | string | Yes      | Valid email format           |
| `password` | string | Yes      | Min 6 characters             |
| `phone`    | string | No       | —                            |

```json
{
  "name": "Sai Ganesh",
  "email": "sai@example.com",
  "password": "password123"
}
```

#### Responses

**`201 Created`**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "665abc123def456789012345",
      "name": "Sai Ganesh",
      "email": "sai@example.com"
    }
  }
}
```

**`409 Conflict`** — Email already registered
```json
{
  "success": false,
  "message": "Email is already registered.",
  "code": "EMAIL_ALREADY_EXISTS"
}
```

**`400 Bad Request`** — Validation failure
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "email", "message": "Please provide a valid email address." }
  ]
}
```

---

### 2. Login

Authenticates a user and returns a JWT.

**`POST /api/auth/login`**

#### Request Body

| Field      | Type   | Required |
|------------|--------|----------|
| `email`    | string | Yes      |
| `password` | string | Yes      |

```json
{
  "email": "sai@example.com",
  "password": "password123"
}
```

#### Responses

**`200 OK`**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "665abc123def456789012345",
      "name": "Sai Ganesh",
      "email": "sai@example.com"
    }
  }
}
```

**`401 Unauthorized`** — Wrong credentials
```json
{
  "success": false,
  "message": "Invalid email or password.",
  "code": "INVALID_CREDENTIALS"
}
```

---

### 3. Get Current User

Returns the profile of the authenticated user.

**`GET /api/auth/me`**  
🔒 **Requires authentication**

#### Responses

**`200 OK`**
```json
{
  "success": true,
  "message": "User profile fetched.",
  "data": {
    "_id": "665abc123def456789012345",
    "name": "Sai Ganesh",
    "email": "sai@example.com",
    "phone": "",
    "createdAt": "2024-06-15T10:00:00.000Z",
    "updatedAt": "2024-06-15T10:00:00.000Z"
  }
}
```

---

## Address Endpoints

> All address endpoints require authentication.

---

### 4. Save Current Location

Reverse geocodes a GPS coordinate via Google Maps and saves it as the user's default address. Prevents duplicates — if an address already exists within **50 meters**, the existing address is returned and set as default instead.

**`POST /api/address/current-location`**  
🔒 **Requires authentication**

#### Request Body

| Field       | Type   | Required | Constraints            |
|-------------|--------|----------|------------------------|
| `latitude`  | number | Yes      | Between -90 and 90     |
| `longitude` | number | Yes      | Between -180 and 180   |

```json
{
  "latitude": 17.385044,
  "longitude": 78.486671
}
```

#### Behavior

| Scenario | Action | Status |
|---|---|---|
| Nearby address found (within 50m) | Returns existing address, sets it as default | `200` |
| User already has a default address | Updates default address with new geocoded data | `200` |
| No existing addresses | Creates a new default address with label `Home` | `201` |

#### Responses

**`201 Created`** — New address created
```json
{
  "success": true,
  "message": "Current location saved successfully.",
  "data": {
    "_id": "665abc123def456789012345",
    "fullAddress": "8-2-293/82/A, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033, India",
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "pincode": "500033",
    "latitude": 17.385044,
    "longitude": 78.486671,
    "isDefault": true
  }
}
```

**`200 OK`** — Nearby address already exists
```json
{
  "success": true,
  "message": "Address already exists nearby. Returning existing address.",
  "data": {
    "_id": "665abc123def456789012345",
    "fullAddress": "8-2-293/82/A, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033, India",
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "pincode": "500033",
    "latitude": 17.385044,
    "longitude": 78.486671,
    "isDefault": true
  }
}
```

---

### 5. Reverse Geocode Preview

Converts a GPS coordinate into a human-readable address using Google Maps **without saving anything to the database**. Use this to show the user a preview of their detected location before they confirm and save it — exactly how Blinkit/Swiggy show "Is this your location?" before persisting.

**`POST /api/address/reverse-geocode`**  
🔒 **Requires authentication**

#### Request Body

| Field       | Type   | Required | Constraints            |
|-------------|--------|----------|------------------------|
| `latitude`  | number | Yes      | Between -90 and 90     |
| `longitude` | number | Yes      | Between -180 and 180   |

```json
{
  "latitude": 17.385044,
  "longitude": 78.486671
}
```

#### Responses

**`200 OK`**
```json
{
  "success": true,
  "message": "Address fetched successfully.",
  "data": {
    "fullAddress": "8-2-293/82/A, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033, India",
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "pincode": "500033",
    "latitude": 17.385044,
    "longitude": 78.486671
  }
}
```

**`404 Not Found`** — Coordinates resolve to no known address
```json
{
  "success": false,
  "message": "No address found for the provided coordinates.",
  "code": "GEOCODE_NO_RESULTS"
}
```

**`503 Service Unavailable`** — Google Maps API issues
```json
{
  "success": false,
  "message": "Google Maps API request timed out. Please try again.",
  "code": "GOOGLE_API_TIMEOUT"
}
```

> **Difference from `POST /api/address/current-location`:**  
> `/reverse-geocode` is a **read-only preview** — nothing is written to the DB.  
> `/current-location` reverse geocodes *and* saves/updates the address as default.

---

### 6. Get Default Address

Returns the user's current default address.

**`GET /api/address/default`**  
🔒 **Requires authentication**

#### Responses

**`200 OK`**
```json
{
  "success": true,
  "message": "Default address fetched successfully.",
  "data": {
    "_id": "665abc123def456789012345",
    "user": "665abc111def456789012345",
    "fullAddress": "8-2-293/82/A, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033, India",
    "houseNo": "",
    "landmark": "",
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "pincode": "500033",
    "latitude": 17.385044,
    "longitude": 78.486671,
    "label": "Home",
    "isDefault": true,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**`404 Not Found`**
```json
{
  "success": false,
  "message": "No default address found.",
  "code": "DEFAULT_ADDRESS_NOT_FOUND"
}
```

---

### 7. Get All Addresses

Returns all saved addresses for the authenticated user with pagination and optional search filters. Default addresses appear first.

**`GET /api/address`**  
🔒 **Requires authentication**

#### Query Parameters

| Parameter | Type    | Required | Default | Constraints          |
|-----------|---------|----------|---------|----------------------|
| `page`    | integer | No       | `1`     | Min 1                |
| `limit`   | integer | No       | `10`    | Min 1, Max 100       |
| `city`    | string  | No       | —       | Case-insensitive     |
| `pincode` | string  | No       | —       | 4–10 digits          |

**Examples:**
```
GET /api/address?page=1&limit=10
GET /api/address?city=Hyderabad
GET /api/address?pincode=500033
GET /api/address?city=Hyderabad&page=2&limit=5
```

#### Responses

**`200 OK`**
```json
{
  "success": true,
  "message": "Addresses fetched successfully.",
  "data": [
    {
      "_id": "665abc123def456789012345",
      "fullAddress": "8-2-293/82/A, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033, India",
      "houseNo": "",
      "landmark": "",
      "city": "Hyderabad",
      "state": "Telangana",
      "country": "India",
      "pincode": "500033",
      "latitude": 17.385044,
      "longitude": 78.486671,
      "label": "Home",
      "isDefault": true,
      "createdAt": "2024-06-15T10:30:00.000Z",
      "updatedAt": "2024-06-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 8. Create Address

Manually creates a new address for the user. Rejects the request if another address already exists within **50 meters** of the given coordinates.

**`POST /api/address`**  
🔒 **Requires authentication**

#### Request Body

| Field        | Type    | Required | Constraints                       |
|--------------|---------|----------|-----------------------------------|
| `city`       | string  | Yes      | Max 100 characters                |
| `state`      | string  | Yes      | Max 100 characters                |
| `country`    | string  | Yes      | Max 100 characters                |
| `latitude`   | number  | Yes      | Between -90 and 90                |
| `longitude`  | number  | Yes      | Between -180 and 180              |
| `houseNo`    | string  | No       | Max 100 characters                |
| `landmark`   | string  | No       | Max 200 characters                |
| `pincode`    | string  | No       | 4–10 digits                       |
| `label`      | string  | No       | `Home`, `Office`, or `Other`      |
| `isDefault`  | boolean | No       | Sets as default if `true`         |

```json
{
  "houseNo": "Flat 301, Block A",
  "landmark": "Near Metro Station",
  "city": "Hyderabad",
  "state": "Telangana",
  "country": "India",
  "pincode": "500081",
  "latitude": 17.4401,
  "longitude": 78.3489,
  "label": "Office",
  "isDefault": false
}
```

#### Responses

**`201 Created`**
```json
{
  "success": true,
  "message": "Address created successfully.",
  "data": {
    "_id": "665def456abc789012345678",
    "user": "665abc111def456789012345",
    "houseNo": "Flat 301, Block A",
    "landmark": "Near Metro Station",
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "pincode": "500081",
    "latitude": 17.4401,
    "longitude": 78.3489,
    "label": "Office",
    "isDefault": false,
    "createdAt": "2024-06-15T11:00:00.000Z",
    "updatedAt": "2024-06-15T11:00:00.000Z"
  }
}
```

**`409 Conflict`** — Duplicate location
```json
{
  "success": false,
  "message": "An address already exists within 50 meters of this location.",
  "code": "DUPLICATE_ADDRESS"
}
```

---

### 9. Update Address

Updates an existing address by its ID. Only fields provided in the request body are updated.

**`PUT /api/address/:id`**  
🔒 **Requires authentication**

#### URL Parameters

| Parameter | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| `id`      | string | Yes      | Valid MongoDB ObjectId |

#### Request Body

All fields are optional. Only provided fields are updated.

| Field       | Type    | Constraints                       |
|-------------|---------|-----------------------------------|
| `city`      | string  | Cannot be empty, max 100 chars    |
| `state`     | string  | Cannot be empty, max 100 chars    |
| `country`   | string  | Cannot be empty, max 100 chars    |
| `houseNo`   | string  | Max 100 characters                |
| `landmark`  | string  | Max 200 characters                |
| `pincode`   | string  | 4–10 digits                       |
| `label`     | string  | `Home`, `Office`, or `Other`      |
| `isDefault` | boolean | —                                 |
| `latitude`  | number  | Between -90 and 90                |
| `longitude` | number  | Between -180 and 180              |
| `fullAddress` | string | —                               |

```json
{
  "houseNo": "Flat 302, Block B",
  "landmark": "Near HICC",
  "label": "Home"
}
```

#### Responses

**`200 OK`**
```json
{
  "success": true,
  "message": "Address updated successfully.",
  "data": {
    "_id": "665def456abc789012345678",
    "user": "665abc111def456789012345",
    "houseNo": "Flat 302, Block B",
    "landmark": "Near HICC",
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "pincode": "500081",
    "latitude": 17.4401,
    "longitude": 78.3489,
    "label": "Home",
    "isDefault": false,
    "createdAt": "2024-06-15T11:00:00.000Z",
    "updatedAt": "2024-06-15T12:00:00.000Z"
  }
}
```

**`404 Not Found`**
```json
{
  "success": false,
  "message": "Address not found.",
  "code": "ADDRESS_NOT_FOUND"
}
```

---

### 10. Delete Address

Deletes an address by its ID. If the deleted address was the default, the most recently created remaining address is automatically promoted to default.

**`DELETE /api/address/:id`**  
🔒 **Requires authentication**

#### URL Parameters

| Parameter | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| `id`      | string | Yes      | Valid MongoDB ObjectId |

#### Responses

**`200 OK`**
```json
{
  "success": true,
  "message": "Address deleted successfully.",
  "data": null
}
```

**`404 Not Found`**
```json
{
  "success": false,
  "message": "Address not found.",
  "code": "ADDRESS_NOT_FOUND"
}
```

---

### 11. Set Default Address

Sets a specific address as the default, automatically removing the default flag from all other addresses.

**`PATCH /api/address/default/:id`**  
🔒 **Requires authentication**

#### URL Parameters

| Parameter | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| `id`      | string | Yes      | Valid MongoDB ObjectId |

#### Responses

**`200 OK`** — Default updated
```json
{
  "success": true,
  "message": "Default address updated successfully.",
  "data": {
    "_id": "665def456abc789012345678",
    "user": "665abc111def456789012345",
    "houseNo": "Flat 301, Block A",
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "isDefault": true
  }
}
```

**`200 OK`** — Already the default
```json
{
  "success": true,
  "message": "Address is already the default.",
  "data": { ... }
}
```

**`404 Not Found`**
```json
{
  "success": false,
  "message": "Address not found.",
  "code": "ADDRESS_NOT_FOUND"
}
```

---

## Health Check

**`GET /health`**  
No authentication required.

#### Response

**`200 OK`**
```json
{
  "success": true,
  "message": "Server is healthy",
  "environment": "development",
  "timestamp": "2024-06-15T10:00:00.000Z"
}
```

---

## Error Reference

All error responses follow this shape:

```json
{
  "success": false,
  "message": "Human-readable message.",
  "code": "MACHINE_READABLE_CODE"
}
```

Validation errors include an additional `errors` array:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "latitude", "message": "Latitude is required." },
    { "field": "longitude", "message": "Longitude is required." }
  ]
}
```

### HTTP Status Codes

| Code | Meaning                                                            |
|------|--------------------------------------------------------------------|
| 200  | Success                                                            |
| 201  | Resource created                                                   |
| 400  | Validation error or malformed request                              |
| 401  | Missing or invalid JWT token                                       |
| 404  | Resource not found                                                 |
| 409  | Conflict — duplicate email or address within 50m                  |
| 429  | Too many requests (rate limit: 100 req / 15 min)                   |
| 500  | Internal server error                                              |

### Error Codes

| Code                          | Status | Description                                    |
|-------------------------------|--------|------------------------------------------------|
| `EMAIL_ALREADY_EXISTS`        | 409    | Email is already registered                    |
| `INVALID_CREDENTIALS`         | 401    | Wrong email or password                        |
| `NO_TOKEN`                    | 401    | Authorization header missing                   |
| `INVALID_TOKEN`               | 401    | Token is malformed or expired                  |
| `DEFAULT_ADDRESS_NOT_FOUND`   | 404    | User has no default address                    |
| `ADDRESS_NOT_FOUND`           | 404    | Address not found or belongs to another user   |
| `DUPLICATE_ADDRESS`           | 409    | Address already exists within 50m              |
| `GEOCODE_NO_RESULTS`          | 404    | No address found for the provided coordinates  |
| `GOOGLE_API_NOT_CONFIGURED`   | 500    | `GOOGLE_MAPS_API_KEY` env var not set          |
| `GOOGLE_API_TIMEOUT`          | 503    | Google Maps API did not respond in time        |
| `GOOGLE_API_NETWORK_ERROR`    | 503    | Could not reach Google Maps API                |
| `GOOGLE_API_DENIED`           | 503    | API key invalid or billing not enabled         |
| `GOOGLE_API_QUOTA_EXCEEDED`   | 503    | Daily/query quota limit reached                |

---

## Address Model

| Field         | Type    | Required | Default | Notes                            |
|---------------|---------|----------|---------|----------------------------------|
| `_id`         | ObjectId | —       | —       | Auto-generated                   |
| `user`        | ObjectId | Yes     | —       | Reference to `User`              |
| `fullAddress` | string  | No       | `""`    | Populated by reverse geocoding   |
| `houseNo`     | string  | No       | `""`    | Max 100 chars                    |
| `landmark`    | string  | No       | `""`    | Max 200 chars                    |
| `city`        | string  | Yes      | —       | Max 100 chars                    |
| `state`       | string  | Yes      | —       | Max 100 chars                    |
| `country`     | string  | Yes      | —       | Max 100 chars                    |
| `pincode`     | string  | No       | `""`    | 4–10 digits                      |
| `latitude`    | number  | Yes      | —       | -90 to 90                        |
| `longitude`   | number  | Yes      | —       | -180 to 180                      |
| `label`       | string  | No       | `Home`  | `Home`, `Office`, or `Other`     |
| `isDefault`   | boolean | No       | `false` | Only one default per user        |
| `createdAt`   | Date    | —        | —       | Auto-generated                   |
| `updatedAt`   | Date    | —        | —       | Auto-generated                   |

---

## Quick Reference

| Method   | Endpoint                       | Auth | Description                        |
|----------|--------------------------------|------|------------------------------------|
| `POST`   | `/api/auth/register`           | —    | Register a new user                |
| `POST`   | `/api/auth/login`              | —    | Login and get JWT                  |
| `GET`    | `/api/auth/me`                 | ✅   | Get current user profile           |
| `POST`   | `/api/address/current-location`| ✅   | Save GPS location as address       |
| `POST`   | `/api/address/reverse-geocode` | ✅   | Preview address for coordinates (no save) |
| `GET`    | `/api/address/default`         | ✅   | Get default address                |
| `GET`    | `/api/address`                 | ✅   | Get all addresses (paginated)      |
| `POST`   | `/api/address`                 | ✅   | Create address manually            |
| `PUT`    | `/api/address/:id`             | ✅   | Update an address                  |
| `DELETE` | `/api/address/:id`             | ✅   | Delete an address                  |
| `PATCH`  | `/api/address/default/:id`     | ✅   | Set an address as default          |
| `GET`    | `/health`                      | —    | Health check                       |
