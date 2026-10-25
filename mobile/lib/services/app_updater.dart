import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:ota_update/ota_update.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../utils/constants.dart';

/// Checks the API for a newer tablet APK and installs it.
/// Menu text and prices do not use this — they already come from the API.
class AppUpdater {
  AppUpdater._();
  static final AppUpdater instance = AppUpdater._();

  bool _busy = false;
  Timer? _timer;
  OverlayEntry? _banner;
  final ValueNotifier<String> _message = ValueNotifier<String>('');

  void start(BuildContext context) {
    _timer?.cancel();
    unawaited(_check(context));
    _timer = Timer.periodic(const Duration(minutes: 15), (_) {
      if (context.mounted) unawaited(_check(context));
    });
  }

  void dispose() {
    _timer?.cancel();
    _removeBanner();
  }

  Future<void> _check(BuildContext context) async {
    if (_busy || !context.mounted) return;
    try {
      final info = await PackageInfo.fromPlatform();
      final localBuild = int.tryParse(info.buildNumber) ?? 0;

      final response = await http
          .get(Uri.parse('${AppConstants.baseUrl}/app-version'))
          .timeout(const Duration(seconds: 20));
      if (response.statusCode != 200) return;

      final body = json.decode(response.body);
      final data = body is Map<String, dynamic> ? body['data'] : null;
      if (data is! Map) return;

      final remoteBuild = (data['build'] as num?)?.toInt() ?? 0;
      final apkUrl = (data['apkUrl'] as String?)?.trim() ?? '';
      if (remoteBuild <= localBuild || apkUrl.isEmpty) return;
      if (!context.mounted) return;

      _busy = true;
      _download(
        context,
        apkUrl,
        data['version']?.toString() ?? '$remoteBuild',
      );
    } catch (_) {
      // A failed check must never stop the kiosk menu.
    }
  }

  void _download(BuildContext context, String url, String version) {
    _showBanner(context, 'Downloading update $version…');

    try {
      OtaUpdate()
          .execute(url, destinationFilename: 'ilmio-update.apk')
          .listen(
        (OtaEvent event) {
          switch (event.status) {
            case OtaStatus.DOWNLOADING:
              final pct = event.value ?? '';
              _message.value = pct.isEmpty
                  ? 'Downloading update $version…'
                  : 'Downloading update $version… $pct%';
            case OtaStatus.INSTALLING:
              _message.value = 'Tap Install to finish the update.';
              _busy = false;
            case OtaStatus.PERMISSION_NOT_GRANTED_ERROR:
              _message.value =
                  'Allow “Install unknown apps” for this app, then reopen it.';
              _busy = false;
              _hideLater();
            case OtaStatus.DOWNLOAD_ERROR:
            case OtaStatus.CHECKSUM_ERROR:
            case OtaStatus.INTERNAL_ERROR:
            case OtaStatus.CANCELED:
            case OtaStatus.ALREADY_RUNNING_ERROR:
              _message.value = 'Update paused. It will try again shortly.';
              _busy = false;
              _hideLater();
          }
        },
        onError: (_) {
          _busy = false;
          _hideLater();
        },
        onDone: () {
          _busy = false;
        },
      );
    } catch (_) {
      _busy = false;
      _removeBanner();
    }
  }

  void _showBanner(BuildContext context, String text) {
    _message.value = text;
    if (_banner != null) return;
    final overlay = Overlay.maybeOf(context);
    if (overlay == null) return;
    _banner = OverlayEntry(
      builder: (_) => Positioned(
        left: 24,
        right: 24,
        bottom: 24,
        child: Material(
          color: Colors.transparent,
          child: ValueListenableBuilder<String>(
            valueListenable: _message,
            builder: (_, text, __) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(AppConstants.darkBrownValue),
                borderRadius: BorderRadius.circular(14),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Text(
                text,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ),
      ),
    );
    overlay.insert(_banner!);
  }

  void _hideLater() {
    Future.delayed(const Duration(seconds: 8), _removeBanner);
  }

  void _removeBanner() {
    _banner?.remove();
    _banner = null;
  }
}
