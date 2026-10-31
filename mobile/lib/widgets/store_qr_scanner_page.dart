import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../services/store_login_qr.dart';

class StoreQrScannerPage extends StatefulWidget {
  const StoreQrScannerPage({super.key});

  @override
  State<StoreQrScannerPage> createState() => _StoreQrScannerPageState();
}

class _StoreQrScannerPageState extends State<StoreQrScannerPage>
    with WidgetsBindingObserver {
  late final MobileScannerController _controller;
  String? _lastInvalidValue;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = MobileScannerController(autoStart: false);
    WidgetsBinding.instance.addPostFrameCallback((_) => _startScanner());
  }

  Future<void> _startScanner() async {
    if (!mounted) return;
    try {
      await _controller.start();
    } on MobileScannerException catch (error) {
      if (mounted) {
        setState(() => _lastInvalidValue = error.errorDetails?.message);
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _startScanner();
    } else if (state == AppLifecycleState.paused) {
      _controller.stop();
    }
  }

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
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
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
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: SizedBox(
              width: 720,
              height: 520,
              child: MobileScanner(
                controller: _controller,
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
          ),
          IgnorePointer(
            child: Align(
              alignment: Alignment.centerLeft,
              child: SizedBox(
                width: 720,
                height: 520,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 560,
                      height: 360,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white, width: 3),
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 18, vertical: 10),
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
            ),
          ),
        ],
      ),
    );
  }
}
