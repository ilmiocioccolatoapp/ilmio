class AppConstants {
  // API Configuration
  static const String baseUrl = 'https://ilmiobackend.onrender.com/api';
  // For local development use: 'http://localhost:5001/api' (iOS simulator)
  // For Android emulator use: 'http://10.0.2.2:5001/api'
  // For physical device use: 'http://YOUR_IP:5001/api'

  static const String productsEndpoint = '/products/available';

  // App Colors - matching HTML design
  static const int primaryColorValue = 0xFF8B4513; // Brown
  static const int darkBrownValue = 0xFF5C3D2E; // Dark brown
  static const int goldAccentValue = 0xFFD4A55C; // Gold
  static const int backgroundColorValue = 0xFFF9F5F0; // Light beige background

  // Animation Durations
  static const Duration pageTransitionDuration = Duration(milliseconds: 300);
  static const Duration loadingDelay = Duration(seconds: 2);
  static const Duration autoAdvanceDuration = Duration(seconds: 5);

  // UI Constants
  static const double cardBorderRadius = 15.0;
  static const double imageBorderRadius = 15.0;
  static const double defaultPadding = 16.0;

  // App Branding
  static const String appName = 'Il mio cioccolato';
  static const String appTagline = 'Artisan Chocolate & Pastries';
}
