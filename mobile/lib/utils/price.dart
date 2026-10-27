const dirhamSymbol = '\u20C3';

/// Converts the stored currency code for display, preserving the price amount.
String displayPrice(String price) {
  final text = price.trim();
  if (text.isEmpty) return '—';
  return text.replaceAll(
      RegExp(r'\bAED\b\s*', caseSensitive: false), '$dirhamSymbol\u00A0');
}
