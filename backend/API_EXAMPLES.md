# API Testing Examples

This file contains sample requests and responses for testing the SmartLogix API.

## Prerequisites

1. Server is running on `http://localhost:5003`
2. MongoDB is connected
3. At least one vehicle exists in the database

## 1. Create Test Vehicles

```bash
curl -X POST http://localhost:5003/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "registrationNumber": "WP-ABC-1234",
    "vehicleType": "truck",
    "capacity": {
      "weight": 1000,
      "volume": 10
    },
    "currentLocation": {
      "coordinates": [79.8612, 6.9271]
    },
    "driver": {
      "name": "Nimal Perera",
      "phone": "+94771234567",
      "licenseNumber": "DL123456"
    },
    "fuelEfficiency": 8
  }'
```

```bash
curl -X POST http://localhost:5003/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "registrationNumber": "WP-XYZ-5678",
    "vehicleType": "van",
    "capacity": {
      "weight": 600,
      "volume": 6
    },
    "currentLocation": {
      "coordinates": [80.7718, 7.2906]
    },
    "driver": {
      "name": "Kamal Silva",
      "phone": "+94779876543",
      "licenseNumber": "DL789012"
    },
    "fuelEfficiency": 10
  }'
```

## 2. Book a Primary Job

```bash
curl -X POST http://localhost:5003/api/jobs/book \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": {
      "weight": 500,
      "volume": 2.5,
      "description": "Electronics - Laptops and Computer Parts",
      "type": "fragile"
    },
    "pickup": {
      "coordinates": [79.8612, 6.9271],
      "address": "123 Galle Road, Colombo 03",
      "datetime": "2026-02-15T08:00:00Z",
      "contactName": "Saman Jayawardena",
      "contactPhone": "+94711234567"
    },
    "delivery": {
      "coordinates": [80.7718, 7.2906],
      "address": "456 Kandy Road, Kandy",
      "datetime": "2026-02-15T14:00:00Z",
      "contactName": "Nimali Fernando",
      "contactPhone": "+94719876543"
    },
    "customer": {
      "name": "TechMart (Pvt) Ltd",
      "phone": "+94112345678",
      "email": "orders@techmart.lk",
      "companyName": "TechMart"
    },
    "pricing": {
      "quotedPrice": 12000
    },
    "specialInstructions": "Handle with extreme care. Fragile electronics."
  }'
```

## 3. Create Potential Backhaul Jobs

These jobs should be created BEFORE booking the primary job to test backhaul matching.

```bash
curl -X POST http://localhost:5003/api/jobs/book \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": {
      "weight": 300,
      "volume": 1.5,
      "description": "Textiles - Cotton Fabric Rolls",
      "type": "general"
    },
    "pickup": {
      "coordinates": [80.7800, 7.3000],
      "address": "789 Temple Road, Kandy",
      "datetime": "2026-02-15T15:00:00Z",
      "contactName": "Ravi Kumar",
      "contactPhone": "+94712223333"
    },
    "delivery": {
      "coordinates": [79.8700, 6.9350],
      "address": "321 Market Street, Colombo 11",
      "datetime": "2026-02-15T20:00:00Z",
      "contactName": "Dilshan Perera",
      "contactPhone": "+94713334444"
    },
    "customer": {
      "name": "Lanka Textiles",
      "phone": "+94812223333",
      "email": "info@lankatextiles.lk"
    },
    "pricing": {
      "quotedPrice": 8000
    }
  }'
```

## 4. Search for Backhaul Opportunities

```bash
# Near Kandy (after delivering primary job)
curl "http://localhost:5003/api/jobs/backhaul?lat=7.2906&lng=80.7718&vehicleId=<VEHICLE_ID>&radius=50000"
```

Replace `<VEHICLE_ID>` with actual vehicle ObjectId from database.

## 5. Get Vehicle Matches (without booking)

```bash
curl -X POST http://localhost:5003/api/jobs/match \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": {
      "weight": 400,
      "volume": 2.0
    },
    "pickup": {
      "coordinates": [79.8612, 6.9271]
    }
  }'
```

## 6. List All Jobs

```bash
# All jobs
curl http://localhost:5003/api/jobs

# Filter by status
curl "http://localhost:5003/api/jobs?status=pending"
curl "http://localhost:5003/api/jobs?status=assigned"
curl "http://localhost:5003/api/jobs?status=completed"

# Pagination
curl "http://localhost:5003/api/jobs?limit=10&skip=0"
```

## 7. Get Specific Job

```bash
curl http://localhost:5003/api/jobs/JOB-2026-0001
```

## 8. List All Vehicles

```bash
# All vehicles
curl http://localhost:5003/api/vehicles

# Filter by status
curl "http://localhost:5003/api/vehicles?status=available"

# Filter by type
curl "http://localhost:5003/api/vehicles?type=truck"
```

## 9. Update Vehicle Location

```bash
curl -X PATCH http://localhost:5003/api/vehicles/<VEHICLE_ID>/location \
  -H "Content-Type: application/json" \
  -d '{
    "longitude": 80.0000,
    "latitude": 7.0000
  }'
```

## 10. Update Trip Status

```bash
curl -X PATCH http://localhost:5003/api/trips/TRIP-2026-0001/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

## 11. Update Driver Position (Real-time Tracking)

```bash
curl -X POST http://localhost:5003/api/trips/TRIP-2026-0001/position \
  -H "Content-Type: application/json" \
  -d '{
    "longitude": 80.3456,
    "latitude": 7.1234
  }'
```

## 12. Get Trip Details

```bash
curl http://localhost:5003/api/trips/TRIP-2026-0001
```

## 13. Health Check

```bash
curl http://localhost:5003/health
```

## Expected Workflow

1. **Setup Phase**:
   - Create 2-3 test vehicles in different locations
   - Create 2-3 pending jobs that could serve as backhauls

2. **Booking Phase**:
   - Book a primary job using `/api/jobs/book`
   - System automatically:
     - Finds best vehicle match
     - Searches for backhaul near delivery location
     - Optimizes route with Google Maps
     - Creates trip with digital manifest
     - Pushes to Firebase

3. **Tracking Phase**:
   - Update trip status to "active"
   - Periodically update driver position
   - Monitor in Firebase Realtime Database

4. **Completion Phase**:
   - Update trip status to "completed"
   - System archives trip in Firebase

## Common Coordinates (Sri Lanka)

```
Colombo: [79.8612, 6.9271]
Kandy: [80.7718, 7.2906]
Galle: [80.2170, 6.0535]
Jaffna: [80.0255, 9.6615]
Trincomalee: [81.2336, 8.5874]
```

## Testing Tips

1. **Use Postman or Thunder Client** for easier testing with saved collections
2. **Check MongoDB** to verify data is being saved correctly
3. **Monitor Firebase Console** to see real-time updates
4. **Use different cargo sizes** to test capacity-based matching algorithm
5. **Vary vehicle locations** to test distance-based scoring
