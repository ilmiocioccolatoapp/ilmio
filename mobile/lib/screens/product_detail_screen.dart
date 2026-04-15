import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final ApiService _apiService = ApiService();

  List<Product> _allProducts = [];
  List<Product> _filteredProducts = [];
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = true;
  String? _errorMessage;
  int _selectedCategoryIndex = 0;
  Product? _selectedProduct;

  static const Color background = Color(0xFFF3ECE6);
  static const Color headerTop = Color(0xFF6B3D27);
  static const Color headerBottom = Color(0xFF8B5639);
  static const Color cardColor = Color(0xFFF7F1EC);
  static const Color textPrimary = Color(0xFF3B2418);
  static const Color accent = Color(0xFFC79A57);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final categories = await _apiService.fetchCategories();
      final products = await _apiService.fetchAvailableProducts();

      if (mounted) {
        setState(() {
          _categories = [
            {'id': 'all', 'name': 'All Items', 'icon': '🍽️'},
            ...categories,
          ];
          _allProducts = products;
          _filterByCategory(0);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  void _filterByCategory(int index) {
    setState(() {
      _selectedCategoryIndex = index;
      final categoryId = _categories[index]['id'] as String;

      if (categoryId == 'all') {
        _filteredProducts = _allProducts;
      } else {
        _filteredProducts = _allProducts
            .where((product) =>
                product.category.toLowerCase() == categoryId.toLowerCase())
            .toList();
      }
      _selectedProduct =
          _filteredProducts.isNotEmpty ? _filteredProducts.first : null;
    });
  }

  List<Product> get _similarProducts {
    if (_selectedProduct == null) return [];
    return _filteredProducts
        .where((p) => p.id != _selectedProduct!.id)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SpinKitFoldingCube(color: headerTop, size: 50.0),
              SizedBox(height: 20),
              Text('Loading...',
                  style: TextStyle(color: headerTop, fontSize: 16)),
            ],
          ),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        backgroundColor: background,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 60, color: Colors.red),
                const SizedBox(height: 20),
                const Text('Oops! Something went wrong',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Text(_errorMessage!, style: TextStyle(color: Colors.grey[700])),
                const SizedBox(height: 30),
                ElevatedButton.icon(
                  onPressed: _loadData,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try Again'),
                  style: ElevatedButton.styleFrom(backgroundColor: headerTop),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final theme = Theme.of(context);
    final mq = MediaQuery.of(context);
    final width = mq.size.width;
    final isWide = width >= 900;

    return Scaffold(
      backgroundColor: background,
      body: Column(
        children: [
          // Header
          Container(
            height: 90,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [headerTop, headerBottom],
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Row(
                children: const [
                  SizedBox(width: 12),
                  Icon(Icons.menu, color: Colors.white),
                  Spacer(),
                  Text('Il mio cioccolato',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w700)),
                  Spacer(),
                  Icon(Icons.search, color: Colors.white),
                  SizedBox(width: 12),
                ],
              ),
            ),
          ),

          // Chips
          SizedBox(
            height: 56,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final selected = index == _selectedCategoryIndex;
                  return GestureDetector(
                    onTap: () => _filterByCategory(index),
                    child: Container(
                      height: 40,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: selected ? accent : Colors.transparent,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                            color: selected
                                ? accent
                                : Colors.black.withAlpha((0.06 * 255).round()),
                            width: 1.2),
                      ),
                      child: Center(
                        child: Text(
                          cat['name'].toString().toUpperCase(),
                          style: TextStyle(
                              color: selected ? Colors.white : textPrimary,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // Content
          Expanded(
            child: _filteredProducts.isEmpty || _selectedProduct == null
                ? const Center(
                    child: Text("No items found in this category.",
                        style: TextStyle(fontSize: 18, color: textPrimary)))
                : LayoutBuilder(builder: (context, constraints) {
                    return SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: SizedBox(
                        height: constraints.maxHeight,
                        child: isWide ? _buildWide(theme) : _buildNarrow(theme),
                      ),
                    );
                  }),
          ),
        ],
      ),
    );
  }

  Widget _buildWide(ThemeData theme) {
    final product = _selectedProduct!;
    final similar = _similarProducts;

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 2,
              child: Container(
                decoration: BoxDecoration(
                  color: cardColor,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AspectRatio(
                    aspectRatio: 16 / 10,
                    child: CachedNetworkImage(
                      imageUrl: product.image,
                      fit: BoxFit.cover,
                      errorWidget: (ctx, _, __) => Container(
                        color: Colors.grey.shade200,
                        alignment: Alignment.center,
                        child: const Icon(Icons.broken_image, size: 40),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              flex: 1,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.title,
                      style: theme.textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(product.ingredients, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: 12),
                  Text(product.description, style: theme.textTheme.bodySmall),
                  const SizedBox(height: 16),
                  if (similar.isNotEmpty) ...[
                    Text('Similar Items', style: theme.textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: similar
                          .map((p) => SizedBox(
                                width: 140,
                                child: GestureDetector(
                                  onTap: () =>
                                      setState(() => _selectedProduct = p),
                                  child: _SimilarItemCard(product: p),
                                ),
                              ))
                          .toList(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNarrow(ThemeData theme) {
    final product = _selectedProduct!;
    final similar = _similarProducts;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withAlpha((0.06 * 255).round()),
                    blurRadius: 12,
                    offset: const Offset(0, 6))
              ]),
          child: AspectRatio(
            aspectRatio: 16 / 10,
            child: Stack(
              children: [
                Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Center(
                        child: ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: CachedNetworkImage(
                              imageUrl: product.image,
                              fit: BoxFit.contain,
                              errorWidget: (ctx, err, stack) => Container(
                                color: Colors.grey.shade200,
                                child: const Icon(Icons.broken_image,
                                    size: 40, color: Colors.black26),
                              ),
                            )))),
                Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 140,
                    child: Container(
                        decoration: const BoxDecoration(
                            borderRadius: BorderRadius.vertical(
                                bottom: Radius.circular(18)),
                            gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.transparent,
                                  Color.fromRGBO(0, 0, 0, 0.35)
                                ])))),
                Positioned(
                    left: 0,
                    right: 0,
                    bottom: 18,
                    child: Center(
                        child: Text(product.title,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                shadows: [
                                  Shadow(
                                      color: Colors.black45,
                                      offset: Offset(0, 2),
                                      blurRadius: 6)
                                ])))),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withAlpha((0.04 * 255).round()),
                    blurRadius: 10,
                    offset: const Offset(0, 4))
              ],
              border: Border.all(
                  color: Colors.black.withAlpha((0.03 * 255).round()))),
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                CircleAvatar(
                    radius: 26,
                    backgroundColor: Colors.grey.shade200,
                    child: ClipOval(
                      child: CachedNetworkImage(
                        imageUrl: product.image,
                        width: 52,
                        height: 52,
                        fit: BoxFit.cover,
                        errorWidget: (ctx, err, stack) => const Icon(
                          Icons.broken_image,
                          size: 26,
                          color: Colors.black26,
                        ),
                      ),
                    )),
                const SizedBox(width: 12),
                Expanded(
                    child: Text(product.title,
                        style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            color: textPrimary)))
              ]),
              const SizedBox(height: 12),
              Text(product.ingredients, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 12),
              Text(product.description, style: theme.textTheme.bodySmall),
              const SizedBox(height: 14),
              if (similar.isNotEmpty) ...[
                Text('Similar Items', style: theme.textTheme.titleLarge),
                const SizedBox(height: 12),
                GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: similar.length,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                            childAspectRatio: 0.72),
                    itemBuilder: (context, index) => GestureDetector(
                          onTap: () =>
                              setState(() => _selectedProduct = similar[index]),
                          child: _SimilarItemCard(product: similar[index]),
                        )),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _SimilarItemCard extends StatelessWidget {
  final Product product;
  const _SimilarItemCard({required this.product});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withAlpha((0.98 * 255).round()),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black.withAlpha((0.03 * 255).round())),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withAlpha((0.03 * 255).round()),
              blurRadius: 8,
              offset: const Offset(0, 4))
        ],
      ),
      padding: const EdgeInsets.all(10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
                aspectRatio: 1.6 / 1,
                child: CachedNetworkImage(
                  imageUrl: product.image,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorWidget: (ctx, err, stack) => Container(
                    color: Colors.grey.shade200,
                    child: const Icon(Icons.broken_image,
                        size: 28, color: Colors.black26),
                  ),
                ))),
        const SizedBox(height: 8),
        Text(product.title,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
        const SizedBox(height: 4),
        Text(product.ingredients,
            style: TextStyle(
                fontSize: 12,
                color: Colors.black.withAlpha((0.6 * 255).round())),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
        const Spacer(),
        Text(product.price,
            style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Color(0xFFC79A57),
                fontSize: 14)),
      ]),
    );
  }
}
