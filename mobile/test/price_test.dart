import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:il_mio_cioccolato/utils/price.dart';
import 'package:il_mio_cioccolato/widgets/price_text.dart';

void main() {
  test(
      'replaces the currency code while preserving amounts and other currencies',
      () {
    expect(displayPrice('AED 25.50'), '$dirhamSymbol\u00A025.50');
    expect(displayPrice(' AED 0.00 '), '$dirhamSymbol\u00A00.00');
    expect(displayPrice('aed 1,234.50'), '$dirhamSymbol\u00A01,234.50');
    expect(
        displayPrice('$dirhamSymbol\u00A025.50'), '$dirhamSymbol\u00A025.50');
    expect(displayPrice('€25.50'), '€25.50');
    expect(displayPrice('Market price'), 'Market price');
    expect(displayPrice(''), '—');
  });

  testWidgets('price has a bundled glyph and an accessible currency label',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
          body: PriceText('AED 25.50', style: TextStyle(fontSize: 26))),
    ));
    final text = tester.widget<Text>(find.text('$dirhamSymbol\u00A025.50'));
    expect(text.style?.fontFamilyFallback, contains('Dirham'));
    expect(text.style?.fontSize, 26);
    expect(text.semanticsLabel, 'UAE dirhams\u00A025.50');
    final font = await rootBundle.load('assets/fonts/dirham.ttf');
    expect(font.lengthInBytes, greaterThan(0));
  });
}
