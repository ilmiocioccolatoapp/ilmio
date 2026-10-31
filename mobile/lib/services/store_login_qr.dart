import 'dart:convert';

class StoreLoginQr {
  const StoreLoginQr({required this.loginCode, required this.token});

  final String loginCode;
  final String token;

  static StoreLoginQr? parse(String? rawValue) {
    if (rawValue == null) return null;
    try {
      final value = jsonDecode(rawValue);
      if (value is! Map<String, dynamic> ||
          value.length != 2 ||
          !value.containsKey('id') ||
          !value.containsKey('token')) {
        return null;
      }
      final loginCode = value['id'];
      final token = value['token'];
      if (loginCode is! String ||
          !RegExp(r'^[a-z0-9][a-z0-9-]{2,39}$').hasMatch(loginCode) ||
          token is! String ||
          !RegExp(r'^[A-Za-z0-9_-]{43}$').hasMatch(token)) {
        return null;
      }
      return StoreLoginQr(loginCode: loginCode, token: token);
    } on FormatException {
      return null;
    }
  }
}
