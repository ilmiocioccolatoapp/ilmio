import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../services/store_login_qr.dart';

class StoreQrScannerPage extends StatefulWidget {
  const StoreQrScannerPage({super.key});

  @override
  State<StoreQrScannerPage> createState() => _StoreQrScannerPageState();
}

class _StoreQrScannerPageState extends State<StoreQrScannerPage> {
  String? _lastInvalidValue;

  void _onDetect(BarcodeCapture capture) {
    for (final barcode in capture.barcodes) {
      final result = StoreLoginQr.parse(barcode.rawValue);
      if (result != null) {
        Navigator.of(context).pop(result);
        return;
      }
      final value = barcode.rawValue;
      if (value != null && value != _lastInvalidValue) {
        _lastInvalidValue = value;
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Invalid Store Login QR.')),
          );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Scan store login QR'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          Positioned.fill(
            child: MobileScanner(
              onDetect: _onDetect,
              errorBuilder: (context, error) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(
                    error.errorCode == MobileScannerErrorCode.permissionDenied
                        ? 'Camera permission is needed to scan a store login QR.'
                        : 'The camera could not be started. Check camera access and try again.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 18),
                  ),
                ),
              ),
            ),
          ),
          IgnorePointer(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 280,
                  height: 220,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white, width: 3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                const SizedBox(height: 24),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Align the store QR code within the frame.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white, fontSize: 16),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
