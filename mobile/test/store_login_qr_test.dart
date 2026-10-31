import 'package:flutter_test/flutter_test.dart';
import 'package:il_mio_cioccolato/services/store_login_qr.dart';

void main() {
  test('parses only the expected one-time store login QR payload', () {
    final token = List.filled(43, 'A').join();
    final qr = StoreLoginQr.parse('{"id":"cbw-alforsan","token":"$token"}');

    expect(qr?.loginCode, 'cbw-alforsan');
    expect(qr?.token, token);
  });

  test('rejects plain IDs, password payloads, URLs, and malformed tokens', () {
    expect(StoreLoginQr.parse('cbw-alforsan'), isNull);
    expect(StoreLoginQr.parse('{"id":"cbw-alforsan","pw":"tablet-password"}'),
        isNull);
    expect(StoreLoginQr.parse('https://example.test'), isNull);
    expect(StoreLoginQr.parse('{"id":"cbw-alforsan","token":"too-short"}'),
        isNull);
    expect(
        StoreLoginQr.parse(
            '{"id":"Bad Store","token":"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO0123456789_-"}'),
        isNull);
  });
}
