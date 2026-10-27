import 'dart:ui' as ui;
import 'package:flutter/rendering.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:il_mio_cioccolato/utils/price.dart';
import 'package:il_mio_cioccolato/widgets/price_text.dart';

void main() {
  setUpAll(() async {
    final loader = FontLoader('DirhamPrice');
    for (final weight in [700, 800, 900]) {
      loader.addFont(rootBundle.load('assets/fonts/dirham-price-$weight.ttf'));
    }
    await loader.load();
  });
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
    expect(text.style?.fontFamily, 'DirhamPrice');
    expect(text.style?.fontSize, 26);
    expect(text.semanticsLabel, 'UAE dirhams\u00A025.50');
    for (final weight in [700, 800, 900]) {
      final font =
          await rootBundle.load('assets/fonts/dirham-price-$weight.ttf');
      expect(font.lengthInBytes, greaterThan(0));
    }
  });

  for (final weight in [FontWeight.w700, FontWeight.w800, FontWeight.w900]) {
    testWidgets('symbol matches numeral ink height and baseline at $weight',
        (tester) async {
      for (final size in [14.0, 26.0, 48.0]) {
        final key = GlobalKey();
        final style =
            TextStyle(fontSize: size, fontWeight: weight, color: Colors.black);
        await tester.pumpWidget(MaterialApp(
            home: Scaffold(
                body: Center(
          child: RepaintBoundary(
              key: key,
              child: ColoredBox(
                  color: Colors.white,
                  child: PriceText('AED 35.00', style: style))),
        ))));
        await tester.pump();
        final painter = TextPainter(
          text: TextSpan(
              text: '$dirhamSymbol\u00A0',
              style: style.copyWith(fontFamily: 'DirhamPrice')),
          textDirection: TextDirection.ltr,
        )..layout();
        const scale = 4.0;
        final split = (painter.width * scale).floor();
        painter.dispose();
        final boundary =
            key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
        final image =
            (await tester.runAsync(() => boundary.toImage(pixelRatio: scale)))!;
        final data = (await tester.runAsync(
            () => image.toByteData(format: ui.ImageByteFormat.rawRgba)))!;
        final top = [image.height, image.height];
        final bottom = [-1, -1];
        for (var y = 0; y < image.height; y++) {
          for (var x = 0; x < image.width; x++) {
            final offset = (y * image.width + x) * 4;
            if (data.getUint8(offset + 3) > 200 &&
                data.getUint8(offset) < 100 &&
                data.getUint8(offset + 1) < 100 &&
                data.getUint8(offset + 2) < 100) {
              final part = x < split ? 0 : 1;
              if (y < top[part]) top[part] = y;
              if (y > bottom[part]) bottom[part] = y;
            }
          }
        }
        image.dispose();
        expect(bottom[0], greaterThanOrEqualTo(0),
            reason: 'Symbol must render');
        expect(bottom[1], greaterThanOrEqualTo(0),
            reason: 'Numerals must render');
        expect((top[0] - top[1]).abs(), lessThanOrEqualTo(4),
            reason: 'Ink tops differ by at most one logical pixel at $size');
        expect((bottom[0] - bottom[1]).abs(), lessThanOrEqualTo(4),
            reason:
                'Ink baselines differ by at most one logical pixel at $size');
      }
    });
  }
}
