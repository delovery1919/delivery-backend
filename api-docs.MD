# API Documentation

## Base URL
```
http://82.29.161.162:3000
```

## Authentication
- No authentication required for the endpoints listed below.

---

## User APIs

### Create User
```
POST /user/create
```
#### Request Body (JSON):
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "state": "California",
  "city": "Los Angeles",
  "locationId": "60a7d5f4b4d1c00015a5e6b4"
}
```
#### Response:
- **200 OK**: User created successfully.
- **400 Bad Request**: User already exists.

---

### Get User by ID
```
GET /user/:id
```
#### Response:
- **200 OK**: Returns user details.
- **400 Bad Request**: User not found.

---

### Get Users by Location
```
GET /users/:location_id
```
#### Response:
- **200 OK**: Returns list of users in the specified location.
- **400 Bad Request**: Error fetching users.

---

## Location APIs

### Create Location
```
POST /locations/create
```
#### Request Body (JSON):
```json
{
  "name": "Main Office",
  "latitude": 34.0522,
  "longitude": -118.2437,
  "radius": 50
}
```
#### Response:
- **201 Created**: Location created successfully.
- **400 Bad Request**: Error creating location.

---

### Get All Locations
```
GET /locations/all
```
#### Response:
- **200 OK**: Returns all locations.
- **400 Bad Request**: Error fetching locations.

---

## Attendance APIs

### Check-in
```
POST /attendance/checkin
```
#### Request Body (JSON):
```json
{
  "partnerId": "60a7d5f4b4d1c00015a5e6b4",
  "locationId": "60a7d5f4b4d1c00015a5e6b5"
}
```
#### Response:
- **201 Created**: Check-in recorded successfully.
- **400 Bad Request**: Failed to check in.

---

### Track Movement
```
POST /attendance/track
```
#### Request Body (JSON):
```json
{
  "attendanceId": "60a7d5f4b4d1c00015a5e6b6",
  "location": { "latitude": 34.0522, "longitude": -118.2437 }
}
```
#### Response:
- **200 OK**: Distance covered updated.
- **400 Bad Request**: Error tracking location.

---

### Check-out
```
POST /attendance/checkout
```
#### Request Body (JSON):
```json
{
  "attendanceId": "60a7d5f4b4d1c00015a5e6b6"
}
```
#### Response:
- **200 OK**: Check-out recorded successfully.
- **400 Bad Request**: Error checking out.

---

## Reports API

### Get Attendance Reports
```
GET /reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```
#### Response:
- **200 OK**: Returns attendance reports between specified dates.
- **400 Bad Request**: Error fetching reports.

