import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:il_mio_cioccolato/screens/gallery_screen.dart';
import 'package:il_mio_cioccolato/screens/session_gate.dart';
import 'package:il_mio_cioccolato/services/store_session.dart';

class TestVault implements SessionVault {
  Map<String, dynamic>? value;

  @override
  Future<Map<String, dynamic>?> read() async => value;

  @override
  Future<void> write(Map<String, dynamic> value) async {
    this.value = value;
  }

  @override
  Future<void> clear() async {
    value = null;
  }
}

class TestCache implements MenuCache {
  final values = <String, Map<String, dynamic>>{};

  @override
  Future<Map<String, dynamic>?> read(String orgId, String storeId) async =>
      values['$orgId:$storeId'];

  @override
  Future<void> write(
      String orgId, String storeId, Map<String, dynamic> value) async {
    values['$orgId:$storeId'] = value;
  }

  @override
  Future<void> clear(String orgId, String storeId) async {
    values.remove('$orgId:$storeId');
  }
}

Map<String, dynamic> menu(List<String> names) => {
      'schemaVersion': 2,
      'store': {
        'id': 'ilmio-main-store',
        'orgId': 'ilmio-org',
        'name': 'Il Mio'
      },
      'revision': 1,
      'brands': [
        for (var i = 0; i < names.length; i++)
          {
            'id': 'brand-$i',
            'name': names[i],
            'currency': 'AED',
            'menuVersion': 1,
            'categories': []
          }
      ]
    };

Future<StoreSessionController> signedIn(List<String> brands) async {
  final client = MockClient((request) async {
    if (request.url.path.endsWith('/auth/store/login')) {
      return http.Response(
          jsonEncode({
            'accessToken': 'access-token',
            'refreshToken': 'refresh-token',
            'store': {
              'id': 'ilmio-main-store',
              'orgId': 'ilmio-org',
              'name': 'Il Mio'
            }
          }),
          200);
    }
    return http.Response(jsonEncode(menu(brands)), 200);
  });
  final controller = StoreSessionController(
      client: client,
      vault: TestVault(),
      cache: TestCache(),
      baseUrl: 'https://test.example/api');
  await controller.login('ilmio-main', 'password');
  return controller;
}

void main() {
  testWidgets('a store assigned to one brand opens its menu directly',
      (tester) async {
    final controller = await signedIn(['Il Mio']);
    addTearDown(controller.dispose);

    await tester
        .pumpWidget(MaterialApp(home: SessionGate(controller: controller)));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(GalleryScreen), findsOneWidget);
    expect(find.text('Store sign in'), findsNothing);
  });

  testWidgets('settings stays at the top right instead of overlapping Back',
      (tester) async {
    final controller = await signedIn(['Il Mio']);
    addTearDown(controller.dispose);

    await tester
        .pumpWidget(MaterialApp(home: SessionGate(controller: controller)));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.text('No Products in this Category'));
    await tester.pump();

    final back = tester.getCenter(find.text('Back'));
    final settings = tester.getCenter(find.byTooltip('Settings'));
    expect(back.dx, lessThan(settings.dx));
    expect(
        settings.dx,
        greaterThan(
            tester.view.physicalSize.width / tester.view.devicePixelRatio / 2));
    expect(settings.dy, lessThan(100));
  });

  testWidgets('a store assigned to multiple brands can choose a menu',
      (tester) async {
    final controller = await signedIn(['Il Mio', 'Second Brand']);
    addTearDown(controller.dispose);

    await tester
        .pumpWidget(MaterialApp(home: SessionGate(controller: controller)));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(GalleryScreen), findsNothing);
    expect(find.text('Il Mio'), findsNWidgets(2));
    expect(find.text('Second Brand'), findsOneWidget);
    final ilmioCard = find.widgetWithText(InkWell, 'Il Mio');
    expect(ilmioCard, findsOneWidget);
    await tester.tap(ilmioCard);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(GalleryScreen), findsOneWidget);
  });
}
