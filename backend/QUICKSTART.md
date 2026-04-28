# SmartLogix Backend - Quick Start Guide

## ✅ Server is Running!

Your SmartLogix backend is now successfully running at:
- **URL**: http://localhost:5003
- **Health Check**: http://localhost:5003/health
- **Status**: MongoDB Connected ✅ | Firebase: Development Mode (optional)

---

## How to Use Your Running Server

### 1. Health Check
```bash
curl http://localhost:5003/health
```

### 2. View All Available Endpoints
```bash
curl http://localhost:5003/
```

### 3. Create a Test Vehicle
```bash
curl -X POST http://localhost:5003/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "registrationNumber": "WP-TEST-001",
    "vehicleType": "truck",
    "capacity": {"weight": 1000, "volume": 10},
    "currentLocation": {"coordinates": [79.8612, 6.9271]},
    "fuelEfficiency": 8
  }'
```

### 4. Check Your Vehicles
```bash
curl http://localhost:5003/api/vehicles
```

### 5. Book a Job (Will Automatically Match Best Vehicle)
```bash
curl -X POST http://localhost:5003/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": {"weight": 500, "volume": 2.5, "description": "Electronics"},
    "pickup": {
      "coordinates": [79.8612, 6.9271],
      "address": "Colombo",
      "datetime": "2026-02-15T08:00:00Z"
    },
    "delivery": {
      "coordinates": [80.7718, 7.2906],
      "address": "Kandy",
      "datetime": "2026-02-15T14:00:00Z"
    },
    "pricing": {"quotedPrice": 12000}
  }'
```

---

## Current Configuration

✅ **MongoDB**: Connected to local instance (`mongodb://localhost:27017/smartlogix`)
⚠️ **Firebase**: Running in DEVELOPMENT MODE (real-time features disabled)
⚠️ **Google Maps**: Not configured (add API key to test route optimization)

---

## To Stop the Server

Press `Ctrl+C` in the terminal where the server is running.

---

## Adding Firebase (Optional)

1. Get Firebase service account credentials from [Firebase Console](https://console.firebase.google.com/)
2. Edit `/Users/mac/Documents/Y2S2/AI:ML Project/SMARTLOGIX/backend/.env`
3. Replace placeholder values:
   ```env
   FIREBASE_PROJECT_ID=your-real-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   ```
4. Restart the server

---

## Adding Google Maps API (For Route Optimization)

1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable: Directions API + Distance Matrix API
3. Edit `/Users/mac/Documents/Y2S2/AI:ML Project/SMARTLOGIX/backend/.env`:
   ```env
   GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
   ```
4. Restart the server

---

## How to Start the Server Again

```bash
cd "/Users/mac/Documents/Y2S2/AI:ML Project/SMARTLOGIX/backend"
npm start
```

**Note**: Server will run on port 5003 (changed from 5000 to avoid conflicts)

---

## What Was Built

- ✅ 3 Database Models (Vehicle, Job, Trip) with geospatial indexing
- ✅ 5 Core Services (Load Matching, Backhaul Finding, Route Optimization, Manifest Generation, Firebase Sync)
- ✅ 15+ API Endpoints for job booking, vehicle management, and trip tracking
- ✅ MongoDB Integration with local database
- ✅ Optional Firebase for real-time features
- ✅ Comprehensive documentation and testing examples

---

## Next Steps

1. **Test the APIs**: Use the curl commands in `API_EXAMPLES.md`
2. **Add Google Maps Key**: Enable route optimization
3. **Add Firebase**: Enable real-time driver updates (optional)
4. **Build Frontend**: Create React app to consume these APIs

---

🚀 **Your SmartLogix backend is ready for development!**
