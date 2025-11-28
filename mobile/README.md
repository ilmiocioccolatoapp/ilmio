# Il Mio Cioccolato - Mobile Gallery App

## Description
Flutter-based mobile gallery app for browsing Il Mio Cioccolato cafe products.

## Features
- Swipeable product gallery with PageView
- Beautiful card-based UI with animations
- Cached network images for performance
- Loading and error states
- Category badges and product details
- Responsive design for all screen sizes

## Prerequisites
- Flutter SDK (>=3.0.0)
- Android Studio / Xcode
- Android device/emulator or iOS device/simulator

## Installation

1. Install dependencies:
```bash
flutter pub get
```

2. Configure API endpoint:

Edit `lib/utils/constants.dart` and update the `baseUrl`:

- **Android Emulator**: `http://10.0.2.2:5001/api`
- **iOS Simulator**: `http://localhost:5001/api`
- **Physical Device**: `http://YOUR_COMPUTER_IP:5001/api`

## Running the App

### Development Mode
```bash
flutter run
```

### Build APK (Android)
```bash
flutter build apk --release
```

The APK will be located at: `build/app/outputs/flutter-apk/app-release.apk`

### Build for iOS
```bash
flutter build ios --release
```

## Project Structure
```
lib/
├── models/          # Data models
├── services/        # API services
├── screens/         # App screens
├── widgets/         # Reusable widgets
├── utils/           # Constants and utilities
└── main.dart        # App entry point
```

## Dependencies
- **http**: API requests
- **provider**: State management
- **cached_network_image**: Image caching
- **flutter_spinkit**: Loading animations

## API Configuration
Ensure the backend server is running before launching the app. The app fetches available products from:
```
GET /api/products/available
```

## Troubleshooting

### Connection Issues
- Verify backend is running on port 5001
- Check firewall settings
- Ensure correct IP address for physical devices
- For Android emulator, use `10.0.2.2` instead of `localhost`

### Build Issues
```bash
flutter clean
flutter pub get
flutter run
```

## Technologies Used
- Flutter 3.x
- Dart
- Material Design 3
- HTTP package for API calls
- Cached Network Images
