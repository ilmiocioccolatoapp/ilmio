import 'package:flutter/material.dart';
import '../utils/price.dart';

/// Uses a bundled glyph so the dirham sign renders on older Android/iOS fonts.
class PriceText extends StatelessWidget {
  const PriceText(this.price, {super.key, this.style});

  final String price;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final text = displayPrice(price);
    return Text(
      text,
      semanticsLabel: text.replaceAll(dirhamSymbol, 'UAE dirhams'),
      style: (style ?? const TextStyle()).copyWith(
        fontFamilyFallback: ['Dirham', ...?style?.fontFamilyFallback],
      ),
    );
  }
}
