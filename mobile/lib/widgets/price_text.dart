import 'package:flutter/material.dart';
import '../utils/price.dart';

/// The price face contains both numerals and a dirham glyph with matching ink
/// height and baseline; system-font fallback cannot guarantee that alignment.
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
        fontFamily:
            text.contains(dirhamSymbol) ? 'DirhamPrice' : style?.fontFamily,
      ),
    );
  }
}
