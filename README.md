# smartlogix
Modular Transport and Logistic Management Ecosystem
<div align="center">
  <img src="smartlogix-mobile/assets/images/SmartLogixLOGO.png" alt="SmartLogix Logo" width="200" />
  <h1>🚚 SmartLogix</h1>
  <p><b>Modular Transport & Logistics Management Ecosystem</b></p>
  
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
</div>

<br />

## 🌟 Overview
**SmartLogix** is a comprehensive, full-stack ecosystem designed to revolutionize transport and logistics management. By bridging the gap between fleet administrators and drivers, SmartLogix streamlines operations, optimizes routes, and enhances delivery transparency.

The platform consists of a robust **Node.js/Express Backend** and a highly responsive **React Native Mobile Application** featuring dedicated portals for both Administrators and Drivers.

---

## 🚀 Key Features

### 👨‍💼 Administrator Portal
- **Job Booking & Dispatch:** Seamlessly create jobs, match loads, and assign optimized routes to drivers.
- **Fleet & Vehicle Management:** Track vehicle statuses, maintenance schedules, and fuel consistency.
- **Driver Monitoring & Scoring:** Monitor real-time driver availability, track incidents, and evaluate performance using an advanced driver scoring algorithm.
- **Economic & Trip Cost Reporting:** Generate comprehensive trip cost reports and economic overviews for accurate financial tracking.
- **Backhaul Finder:** Intelligently identify backhaul opportunities to maximize vehicle utilization and profitability.

### 🚛 Driver Portal
- **Active Trip Management:** View current assignments, manifest details, and optimized routes.
- **Proof of Delivery (POD):** Capture digital signatures and photos for secure and verified deliveries.
- **Activity & Notifications:** Real-time push notifications and a detailed history of completed trips and activities.
- **Trip Refusals:** Manage and log trip refusals with appropriate justification workflows.

---

## 🧩 Core Modular Components

The application is cleanly structured into **6 distinct functional components**, allowing for scalable development and a highly organized workflow:

1. **Job Booking Module** (`job-booking`)
   - **Forms & Steps:** Multi-step wizard for capturing customer details, cargo specs, and locations.
   - **Logistics Logic:** Backhaul finder integration, driver selection, and vehicle allocation.
   - **Pricing:** Dynamic cost and pricing generation based on distance and load.

2. **Trip Management Module** (`trips`)
   - **Active Tracking:** Live monitoring of dispatched trips and route overviews.
   - **Trip Details:** Granular view of manifest assignments and driver progress.
   - **History:** Comprehensive list of past and completed trips.

3. **Driver Monitor Module** (`driver-monitor`)
   - **Performance Tracking:** Real-time driver scoring algorithm evaluation.
   - **Availability:** Live tracking of driver schedules and readiness.
   - **Incident Logging:** Recording and managing driver incidents.

4. **Vehicle Manager Module** (`vehicle-manager`)
   - **Fleet Tracking:** Centralized dashboard for all vehicles in the network.
   - **Maintenance:** Tracking service schedules and mechanical statuses.
   - **Fuel Logging:** Monitoring fuel consistency and consumption rates.

5. **Economics & Reporting Module** (`economics`)
   - **Financial Dashboards:** Revenue overviews and total trip cost breakdowns.
   - **Expense Tracking:** Monitoring per-mile costs and logistical expenses.
   - **Analytics:** Data-driven reports for company-wide economic analysis.

6. **Proof of Delivery & Exceptions Module** (`proof-of-delivery` & `trip-refusals`)
   - **POD Management:** Secure digital signature and photo capture workflows.
   - **Refusals:** Handling trip rejections by drivers with built-in reassignment logic.

---

## 🛠️ Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **React Native (Expo)** | Cross-platform Mobile Application (iOS & Android) |
| **React Navigation** | App routing (Drawer, Tabs, Stack Navigation) |
| **Node.js & Express** | Robust Backend RESTful API Server |
| **MongoDB & Mongoose** | NoSQL Database for scalable data modeling |
| **Nodemailer** | Automated Email Notification Service |
| **Axios** | HTTP Client for seamless frontend-backend communication |

---

## 📂 Project Structure

```bash
SMARTLOGIX/
├── backend/                  # Node.js Express Server
│   ├── models/               # Mongoose Database Schemas
│   ├── routes/               # API Endpoints
│   └── services/             # Core Business Logic (Route Optimization, Load Matching)
│
└── smartlogix-mobile/        # React Native Frontend App
    ├── assets/               # Fonts, Images, and Logos
    ├── components/           # Reusable UI Components
    ├── constants/            # Theme, Layout, and Styling Constants
    ├── navigation/           # App Navigators (Admin Tab, Main Tab, Drawer)
    ├── screens/              # App Screens (Admin Modules, Driver Views)
    └── services/             # Frontend API integration (Axios)
```

---

## 🚦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)

### 1. Clone the Repository
```bash
git clone https://github.com/maliyah003/smartlogix-mobile.git
cd SMARTLOGIX
```

### 2. Setup the Backend
```bash
cd backend
npm install
# Ensure MongoDB is running and configure your environment variables
npm start
```

### 3. Setup the Mobile App
```bash
cd ../smartlogix-mobile
npm install
npm start
# Follow the terminal prompts to open the app on an iOS/Android simulator or physical device via Expo Go.
```

---

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Built with ❤️ for Modern Logistics.</p>
</div>
