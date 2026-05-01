# EnRoute  
*A Smart Indoor Building Navigation Platform*

## Overview
EnRoute is a mobile indoor navigation application designed to help users navigate large and complex indoor spaces with ease. Whether locating classrooms, offices, events, amenities, or custom saved locations, EnRoute provides an intuitive interactive mapping experience through real-time navigation, searchable destinations, and personalized wayfinding tools.

Built with scalability in mind, EnRoute is designed to support multiple buildings, campuses, and indoor environments in the future. Patrick F. Taylor Hall which currently serves as the first implementation and testing environment, showcasing EnRoute’s core navigation capabilities in a real-world building setting.

EnRoute bridges the gap between outdoor GPS navigation and indoor wayfinding, making indoor spaces just as easy to explore as city streets.


## Features

### Interactive 3D Navigation
- Fully interactive 3D indoor map
- Smooth pan, zoom, rotate, and tilt controls
- Multi-floor building support
- Dynamic camera movement and floor switching
- Real-time user positioning within building space

### Smart Search
- Search rooms by room number
- Search locations by category
- Search events by title or organization
- Instant search suggestions
- Quick navigation from search results

### Indoor Route Guidance
- Step-by-step indoor navigation
- Dynamic route generation
- Estimated walking time
- Real-time route updates
- Clear destination highlighting
- Navigation overlay interface

### Nearby Filters
Quickly locate nearby amenities such as:
- Restrooms
- Study Rooms
- Vending Machines
- Water Fountains
- Elevators
- Emergency Exits
- Fire Extinguishers
- Defibrillators

### Event Discovery
- Browse building events
- View event details
- Save favorite events
- Navigate directly to event locations

### Custom Pin System
- Drop pins anywhere on the map
- Custom pin titles
- Multiple pin colors
- Delete saved pins
- Quick jump to saved locations

### Personalized Saved Content
- Saved events
- Saved rooms
- Saved pins
- Swipe-to-delete interactions
- Profile view for quick access

### Device Integration
- GPS location support
- Compass heading integration
- Live movement tracking
- Responsive gesture controls


## Tech Stack

### Frontend
- React Native
- Expo
- TypeScript

### 3D Rendering
- Three.js
- @react-three/fiber
- @react-three/drei

### UI / Interaction
- React Native Animated API
- Expo Blur
- Gorhom Bottom Sheet
- React Native Gesture Handler
- Ionicons

### Sensors / APIs
- Expo Location
- Expo Magnetometer


## Installation

### Clone Repository
```bash
git clone https://github.com/Froggie-A/EnRoute.git
cd EnRoute
```

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npx expo start
```

### Run Application
- Open with Expo Go  
or
- Run on Android Emulator / iOS Simulator

---

## How It Works
1. Launch EnRoute  
2. Explore the interactive 3D building map  
3. Search for rooms, events, or nearby amenities  
4. Select a destination  
5. Receive step-by-step indoor navigation  
6. Save favorite locations, events, or custom pins for future use  

---

## Future Improvements
- Multi-building support
- Campus-wide deployment
- Accessibility-first routing
- Voice-guided navigation
- Live occupancy / room availability
- Personalized recommendations
- Cloud sync for saved content
- AR indoor navigation overlay
- Emergency evacuation routing

---

## Team
Developed by the EnRoute Team as a scalable indoor navigation solution, with Patrick F. Taylor Hall serving as the initial deployment environment.

- Maggie Xiao
- Stacy Nguyen
- Amy Tran
- Kim Nguyen
- Genesis Escobar