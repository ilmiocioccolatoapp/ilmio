import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/product.dart';
import '../utils/constants.dart';
import '../utils/image_utils.dart';
import 'price_text.dart';

/// The customer detail page, separate from the automatic image slideshow.
class ProductDetailsPage extends StatelessWidget {
  const ProductDetailsPage({super.key, required this.product});

  final Product product;

  static const _ink = Color(AppConstants.darkBrownValue);

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(AppConstants.backgroundColorValue),
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 850;
            final image = ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: ColoredBox(
                color: Colors.white,
                child: CachedNetworkImage(
                  imageUrl: getSizedImageUrl(product.image, context),
                  width: double.infinity,
                  height: double.infinity,
                  fit: BoxFit.contain,
                  placeholder: (context, url) => Center(
                    child: CircularProgressIndicator(
                        color: Theme.of(context).colorScheme.primary,
                        strokeWidth: 2),
                  ),
                  errorWidget: (context, url, error) => const Center(
                    child: Icon(Icons.image_not_supported_outlined,
                        size: 48, color: _ink),
                  ),
                ),
              ),
            );
            final details = SingleChildScrollView(
              key: PageStorageKey('details-${product.id}'),
              padding: EdgeInsets.symmetric(vertical: wide ? 24 : 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    style: TextStyle(
                      color: _ink,
                      fontSize: wide ? 38 : 28,
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.8,
                    ),
                  ),
                  if (!product.available) const Chip(label: Text('Sold out')),
                  const SizedBox(height: 18),
                  if (product.sizes.isEmpty)
                    PriceText(
                      product.price,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                      ),
                    )
                  else ...[
                    const Text('Sizes & prices',
                        style: TextStyle(
                            color: _ink,
                            fontSize: 17,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    ...product.sizes.map((size) => _priceRow(
                          size.name,
                          size.price,
                          available: size.available,
                        )),
                  ],
                  if (product.addOnGroups.isNotEmpty) ...[
                    const SizedBox(height: 22),
                    const Text('Add-ons',
                        style: TextStyle(
                            color: _ink,
                            fontSize: 20,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    ...product.addOnGroups.map((group) => Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                group.name,
                                style: const TextStyle(
                                    color: _ink,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              ...group.options.map((option) => _priceRow(
                                    option.name,
                                    '+ ${option.price}',
                                    available: option.available,
                                  )),
                            ],
                          ),
                        )),
                  ],
                  const SizedBox(height: 24),
                  Divider(color: _ink.withValues(alpha: 0.12), height: 1),
                  const SizedBox(height: 24),
                  _section('Description', product.description,
                      'No description available.'),
                  const SizedBox(height: 24),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0E7DC),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: _section('Ingredients', product.ingredients,
                        'Ingredients not provided.'),
                  ),
                ],
              ),
            );

            return Padding(
              padding: EdgeInsets.fromLTRB(64, 84, 64, wide ? 32 : 16),
              child: wide
                  ? Row(
                      children: [
                        Expanded(flex: 6, child: image),
                        const SizedBox(width: 40),
                        Expanded(flex: 4, child: Center(child: details)),
                      ],
                    )
                  : Column(
                      children: [
                        Expanded(flex: 5, child: image),
                        const SizedBox(height: 16),
                        Expanded(flex: 5, child: details),
                      ],
                    ),
            );
          },
        ),
      ),
    );
  }

  Widget _section(String title, String text, String fallback) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: const TextStyle(
                color: _ink, fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text(
          text.trim().isEmpty ? fallback : text.trim(),
          style: TextStyle(
              color: _ink.withValues(alpha: 0.72), fontSize: 17, height: 1.6),
        ),
      ],
    );
  }

  Widget _priceRow(String name, String price, {required bool available}) {
    return Opacity(
      opacity: available ? 1 : 0.48,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          children: [
            Expanded(
              child: Text(
                name,
                style: TextStyle(
                  color: _ink,
                  fontSize: 16,
                  decoration: available ? null : TextDecoration.lineThrough,
                ),
              ),
            ),
            PriceText(
              price,
              style: const TextStyle(
                  color: _ink, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            if (!available) ...[
              const SizedBox(width: 8),
              const Text('Unavailable',
                  style: TextStyle(color: _ink, fontSize: 11)),
            ],
          ],
        ),
      ),
    );
  }
}
