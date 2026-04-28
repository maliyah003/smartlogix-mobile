# Smart Job Booking & Route Optimizer

## Overview

The **Smart Job Booking & Route Optimizer** is a core component of SmartLogix, designed to reduce empty miles and optimize logistics costs for Sri Lankan SMEs. This system automates load matching, coordinates backhaul opportunities, and generates optimized routes with digital manifests.

## Key Features

- **Automated Load Matching**: Matches cargo to the most efficient vehicle based on capacity utilization (60%) and proximity (40%)
- **Backhaul Coordination**: Dynamically searches for return loads within 10% of trip distance to eliminate empty return journeys
- **Route Optimization**: Integrates with Google Maps Directions API for multi-stop route optimization
- **Digital Manifest**: Generates comprehensive trip documentation with economics, compliance, and schedule
- **Real-time Tracking**: Syncs trip data to Firebase for instant driver updates
- **Geospatial Search**: Uses MongoDB 2dsphere indexes for fast proximity-based queries

## Architecture

```
Backend Stack:
├── Node.js/Express: RESTful API server
├── MongoDB (Mongoose): Primary data storage with geospatial indexing
├── Firebase Realtime Database: Real-time driver updates
└── Google Maps Platform: Route optimization and distance calculations
```

## Project Structure

```
backend/
├── models/
│   ├── vehicle.model.js      # Vehicle schema with geospatial location
│   ├── job.model.js           # Job schema with pickup/delivery locations
│   └── trip.model.js          # Trip schema with route and manifest
├── services/
│   ├── loadMatcher.service.js        # Vehicle matching algorithm
│   ├── backhaulFinder.service.js     # Backhaul search with geospatial queries
│   ├── routeOptimizer.service.js     # Google Maps integration
│   ├── manifestGenerator.service.js  # Digital manifest creation
│   └── firebase.service.js           # Firebase real-time sync
├── routes/
│   ├── job.routes.js          # Job booking and backhaul endpoints
│   ├── trip.routes.js         # Trip management and tracking
│   └── vehicle.routes.js      # Vehicle CRUD operations
├── config/
│   └── database.js            # MongoDB connection
├── server.js                  # Express app entry point
├── package.json
└── .env.example
```

## Installation

### Prerequisites

- Node.js >= 14.0.0
- MongoDB (local or Atlas)
- Google Maps API key
- Firebase project

### Setup

1. **Clone and navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
MONGODB_URI=mongodb://localhost:27017/smartlogix
GOOGLE_MAPS_API_KEY=your_api_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

4. **Start MongoDB** (if running locally)
```bash
mongod
```

5. **Start the server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5003`

## API Documentation

### Job Booking

#### POST /api/jobs/book

Book a new job with automatic vehicle matching and backhaul coordination.

**Request Body:**
```json
{
  "cargo": {
    "weight": 500,
    "volume": 2.5,
    "description": "Electronics",
    "type": "fragile"
  },
  "pickup": {
    "coordinates": [79.8612, 6.9271],
    "address": "123 Main St, Colombo",
    "datetime": "2026-02-15T08:00:00Z",
    "contactName": "John Doe",
    "contactPhone": "+94771234567"
  },
  "delivery": {
    "coordinates": [80.7718, 7.2906],
    "address": "456 Hill St, Kandy",
    "datetime": "2026-02-15T14:00:00Z",
    "contactName": "Jane Smith",
    "contactPhone": "+94779876543"
  },
  "customer": {
    "name": "ABC Company",
    "phone": "+94771111111",
    "email": "info@abc.com"
  },
  "pricing": {
    "quotedPrice": 10000
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job booked successfully with backhaul coordination",
  "data": {
    "job": {
      "jobId": "JOB-2026-0001",
      "status": "assigned"
    },
    "vehicle": {
      "registrationNumber": "ABC-1234",
      "type": "truck",
      "matchScore": "87.50"
    },
    "backhaul": {
      "jobId": "JOB-2026-0034",
      "savings": 2500
    },
    "route": {
      "distance": "115.00 km",
      "duration": "3.00 hours",
      "estimatedFuelCost": "LKR 5031"
    },
    "economics": {
      "totalRevenue": 15000,
      "estimatedProfit": 9800,
      "emptyMilesReduction": "50%"
    }
  }
}
```

### Backhaul Search

#### GET /api/jobs/backhaul

Find backhaul opportunities near a location.

**Query Parameters:**
- `lat`: Latitude
- `lng`: Longitude
- `vehicleId`: Vehicle ID
- `radius`: Search radius in meters (optional, default 50km)

**Example:**
```
GET /api/jobs/backhaul?lat=7.2906&lng=80.7718&vehicleId=65f123abc456def789&radius=50000
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "opportunities": [
    {
      "jobId": "JOB-2026-0034",
      "cargo": {
        "weight": 300,
        "volume": 1.5,
        "description": "Textiles"
      },
      "pickup": {
        "address": "789 Commerce Rd, Kandy",
        "coordinates": [80.7800, 7.3000]
      },
      "distanceFromDelivery": 1200,
      "utilization": {
        "weight": "30.0%",
        "volume": "15.0%"
      },
      "score": "85.50"
    }
  ]
}
```

### Vehicle Matching

#### POST /api/jobs/match

Get vehicle matches for a hypothetical job without creating it.

**Request Body:**
```json
{
  "cargo": {
    "weight": 500,
    "volume": 2.5
  },
  "pickup": {
    "coordinates": [79.8612, 6.9271]
  }
}
```

### Trip Management

#### GET /api/trips/:tripId

Get trip details.

#### PATCH /api/trips/:tripId/status

Update trip status (`scheduled`, `active`, `completed`, `cancelled`).

#### POST /api/trips/:tripId/position

Update driver's current position for real-time tracking.

**Request Body:**
```json
{
  "longitude": 80.1234,
  "latitude": 7.5678
}
```

### Vehicle Management

#### GET /api/vehicles

List all vehicles. Filter by `status` or `type`.

#### POST /api/vehicles

Create a new vehicle.

**Request Body:**
```json
{
  "registrationNumber": "ABC-1234",
  "vehicleType": "truck",
  "capacity": {
    "weight": 1000,
    "volume": 10
  },
  "currentLocation": {
    "coordinates": [79.8612, 6.9271]
  },
  "driver": {
    "name": "Driver Name",
    "phone": "+94771234567",
    "licenseNumber": "DL123456"
  },
  "fuelEfficiency": 8
}
```

## Algorithm Details

### Load Matching Algorithm

**Score = (Distance Score × 0.4) + (Capacity Score × 0.6)**

- **Capacity Score**: Optimal utilization is 70-85%. Under/over-utilization is penalized.
- **Distance Score**: Inverse linear relationship (closer = higher score).

### Backhaul Search

- **Dynamic Radius**: 10% of primary trip distance (min 10km, max 100km)
- **Geospatial Query**: MongoDB `$geoNear` aggregation
- **Ranking**: Combines proximity (50%) + capacity utilization (50%)

### Route Optimization

- **Google Maps Directions API**: Multi-waypoint optimization
- **Waypoint Order**: Primary pickup → Primary delivery → Backhaul pickup → Backhaul delivery
- **Fuel Cost**: Calculated using distance and vehicle-specific fuel efficiency

## Firebase Integration

### Real-time Data Structure

```
/trips
  /{tripId}
    /vehicle: { ... }
    /route: { coordinates, distance, duration }
    /primaryJob: { ... }
    /backhaulJob: { ... }
    /currentPosition: { coordinates, timestamp }
    /status: "active"
```

### Driver Mobile App Integration

The driver app should listen to Firebase updates:

```javascript
// Example: React Native / Flutter
firebase.database().ref(`trips/${tripId}`).on('value', (snapshot) => {
  const trip = snapshot.val();
  // Update UI with trip data
});
```

## Testing

### Sample Data Creation

Create test vehicles:
```bash
curl -X POST http://localhost:5003/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "registrationNumber": "TEST-001",
    "vehicleType": "truck",
    "capacity": {"weight": 1000, "volume": 10},
    "currentLocation": {"coordinates": [79.8612, 6.9271]},
    "fuelEfficiency": 8
  }'
```

Book a test job:
```bash
curl -X POST http://localhost:5003/api/jobs/book \
  -H "Content-Type: application/json" \
  -d @test-job.json
```

## Future ML Integration Points

The architecture supports future AI/ML enhancements:

1. **Predictive Maintenance**: Use vehicle `lastUpdated` timestamps for IoT sensor data
2. **Demand Forecasting**: Historical job patterns for predictive booking
3. **Dynamic Pricing**: Manifest economics data for ML-based pricing models
4. **Route Learning**: Trip history to train custom route optimization

Add ML microservices as:
```
backend/
├── ml/
│   ├── predictiveMaintenance.py
│   ├── demandForecasting.py
│   └── api-bridge.js
```

## Performance Considerations

- **Geospatial Indexes**: 2dsphere indexes on all location fields
- **Connection Pooling**: MongoDB connection pool (10 max, 2 min)
- **Caching**: Consider Redis for frequent backhaul searches (future enhancement)
- **Rate Limiting**: Add API rate limiting for production (future enhancement)

## Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB is running: `mongod --version`
- Check connection string in `.env`

### Google Maps API Errors
- Verify API key has Directions API and Distance Matrix API enabled
- Check billing is configured in Google Cloud Console

### Firebase Initialization Fails
- Verify Firebase credentials in `.env`
- Check private key format (replace `\n` with actual newlines)

## License

ISC

## Support

For issues and questions, contact the SmartLogix development team.
