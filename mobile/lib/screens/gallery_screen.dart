import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import '../utils/image_utils.dart';
import '../widgets/product_card.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  final ApiService _apiService = ApiService();
  final PageController _pageController = PageController();
  Timer? _autoAdvanceTimer;
  Timer? _idleTimer;
  Timer? _collapseCategoriesTimer;
  bool _showCategories = false;

  /// true = interactive menu grid; false = attract mode (auto slideshow)
  bool _menuMode = false;

  List<Product> _allProducts = [];
  List<Product> _filteredProducts = [];
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = true;
  String? _errorMessage;
  int _currentPage = 0;
  String _selectedCategory = 'all';

  /// How long without touch before returning to attract mode
  static const Duration _idleTimeout = Duration(seconds: 45);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _autoAdvanceTimer?.cancel();
    _idleTimer?.cancel();
    _collapseCategoriesTimer?.cancel();
    super.dispose();
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
          _filteredProducts = products;
          _isLoading = false;
        });
        _startAttractMode();
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

  Future<void> _loadProducts() async {
    await _loadData();
  }

  /// Full-screen slideshow: continuously cycles product image + name + price
  void _startAttractMode() {
    _autoAdvanceTimer?.cancel();
    _idleTimer?.cancel();

    if (_menuMode) return;
    if (_filteredProducts.isEmpty) return;

    _autoAdvanceTimer =
        Timer.periodic(AppConstants.autoAdvanceDuration, (timer) {
      if (!mounted || _menuMode || _filteredProducts.isEmpty) return;
      if (!_pageController.hasClients) return;

      final nextPage = (_currentPage + 1) % _filteredProducts.length;
      _pageController.animateToPage(
        nextPage,
        duration: AppConstants.pageTransitionDuration,
        curve: Curves.easeInOut,
      );
    });
  }

  void _enterMenuMode() {
    if (_menuMode) {
      _resetIdleTimer();
      return;
    }
    setState(() {
      _menuMode = true;
      _showCategories = true;
    });
    _autoAdvanceTimer?.cancel();
    _resetIdleTimer();
  }

  void _exitMenuMode() {
    if (!_menuMode) return;
    setState(() {
      _menuMode = false;
      _showCategories = false;
      _selectedCategory = 'all';
      _filteredProducts = _allProducts;
      _currentPage = 0;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_pageController.hasClients && _filteredProducts.isNotEmpty) {
        _pageController.jumpToPage(0);
      }
      _startAttractMode();
    });
  }

  void _resetIdleTimer() {
    _idleTimer?.cancel();
    if (!_menuMode) return;
    _idleTimer = Timer(_idleTimeout, () {
      if (mounted) _exitMenuMode();
    });
  }

  void _onUserInteraction([_]) {
    if (_menuMode) {
      _resetIdleTimer();
    } else {
      _enterMenuMode();
    }
  }

  void _filterByCategory(String categoryId) {
    _onUserInteraction();
    setState(() {
      _selectedCategory = categoryId;
      if (categoryId == 'all') {
        _filteredProducts = _allProducts;
      } else {
        _filteredProducts = _allProducts
            .where((product) =>
                product.category.toLowerCase() == categoryId.toLowerCase())
            .toList();
      }
      _currentPage = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth >= 600;

    return Scaffold(
      backgroundColor: const Color(AppConstants.backgroundColorValue),
      body: SafeArea(
        top: false,
        child: _isLoading
            ? _buildLoadingState()
            : _errorMessage != null
                ? _buildErrorState()
                : Listener(
                    behavior: HitTestBehavior.translucent,
                    onPointerDown: _onUserInteraction,
                    child: Column(
                      children: [
                        _buildHeader(isTablet),
                        Expanded(
                          child: RefreshIndicator(
                            onRefresh: () async {
                              _onUserInteraction();
                              await _loadProducts();
                            },
                            color: const Color(AppConstants.primaryColorValue),
                            child: _buildMainContent(isTablet),
                          ),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildMainContent(bool isTablet) {
    if (_filteredProducts.isEmpty) {
      return Column(
        children: [
          const SizedBox(height: 10),
          if (_menuMode) _buildCategoryButtons(true),
          Expanded(child: _buildEmptyState()),
        ],
      );
    }

    // Attract mode: continuous full-screen name + price slideshow
    if (!_menuMode) {
      return _buildAttractMode();
    }

    // Menu mode: interactive category chips + product grid
    return Column(
      children: [
        const SizedBox(height: 10),
        _buildCategoryButtons(true),
        const SizedBox(height: 8),
        Expanded(child: _buildProductGrid()),
      ],
    );
  }

  /// Idle / attract: big image with name + price, auto-advances
  Widget _buildAttractMode() {
    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          controller: _pageController,
          onPageChanged: (index) {
            setState(() => _currentPage = index);
          },
          itemCount: _filteredProducts.length,
          itemBuilder: (context, index) {
            return _buildAttractSlide(_filteredProducts[index]);
          },
        ),
        // Subtle hint
        Positioned(
          bottom: 28,
          left: 0,
          right: 0,
          child: IgnorePointer(
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Text(
                  'Tap anywhere to browse the menu',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAttractSlide(Product product) {
    final imageUrl = getSizedImageUrl(product.image, context);
    final priceText =
        product.price.trim().isEmpty ? '—' : product.price.trim();

    return Stack(
      fit: StackFit.expand,
      children: [
        CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            color: const Color(AppConstants.darkBrownValue)
                .withValues(alpha: 0.12),
            child: const Center(
              child: SpinKitFoldingCube(
                color: Color(AppConstants.primaryColorValue),
                size: 50.0,
              ),
            ),
          ),
          errorWidget: (context, url, error) => Container(
            color: const Color(0xFFF3E9DC),
            child: const Icon(Icons.image_not_supported_outlined, size: 48),
          ),
        ),
        // Gradient for text readability
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          height: 220,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  const Color(AppConstants.darkBrownValue)
                      .withValues(alpha: 0.88),
                ],
              ),
            ),
          ),
        ),
        // Name + price
        Positioned(
          left: 32,
          right: 32,
          bottom: 72,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                product.title,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                  height: 1.15,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(AppConstants.goldAccentValue),
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.25),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Text(
                  priceText,
                  style: const TextStyle(
                    color: Color(AppConstants.darkBrownValue),
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProductGrid() {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      physics: const AlwaysScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 280,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 0.72,
      ),
      itemCount: _filteredProducts.length,
      itemBuilder: (context, index) {
        final product = _filteredProducts[index];
        return ProductCard(
          product: product,
          onTap: _onUserInteraction,
        );
      },
    );
  }

  Widget _buildHeader(bool isTablet) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + (isTablet ? 8 : 6),
        bottom: isTablet ? 12 : 8,
        left: isTablet ? 24 : 12,
        right: isTablet ? 24 : 12,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(AppConstants.primaryColorValue),
            Color(AppConstants.darkBrownValue),
          ],
        ),
      ),
      child: Row(
        children: [
          if (_menuMode)
            IconButton(
              tooltip: 'Back to slideshow',
              icon: const Icon(Icons.slideshow_rounded, color: Colors.white),
              onPressed: _exitMenuMode,
            )
          else
            const SizedBox(width: 48),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.restaurant_menu,
                  color: const Color(AppConstants.goldAccentValue),
                  size: isTablet ? 28 : 18,
                ),
                SizedBox(width: isTablet ? 10 : 6),
                Text(
                  AppConstants.appName,
                  style: TextStyle(
                    fontSize: isTablet ? 24 : 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 0.4,
                  ),
                ),
              ],
            ),
          ),
          if (_menuMode)
            IconButton(
              tooltip: 'Browse menu',
              icon: const Icon(Icons.grid_view_rounded, color: Colors.white),
              onPressed: _onUserInteraction,
            )
          else
            IconButton(
              tooltip: 'Open menu',
              icon: const Icon(Icons.touch_app_rounded, color: Colors.white),
              onPressed: _enterMenuMode,
            ),
        ],
      ),
    );
  }

  Widget _buildCategoryButtons(bool isTablet) {
    if (_categories.isEmpty) return const SizedBox.shrink();

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 12),
      child: Row(
        children: _categories.map((category) {
          final categoryId = category['id'] as String;
          final categoryName = category['name'] as String;
          final categoryIcon = category['icon'] as String;
          final isActive = categoryId == _selectedCategory;

          return Padding(
            padding: EdgeInsets.only(right: isTablet ? 12 : 8),
            child: GestureDetector(
              onTap: () => _filterByCategory(categoryId),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding: EdgeInsets.symmetric(
                  horizontal: isTablet ? 20 : 14,
                  vertical: isTablet ? 10 : 8,
                ),
                decoration: BoxDecoration(
                  color: isActive
                      ? const Color(AppConstants.primaryColorValue)
                      : const Color(0xFFE8D0B3),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: isActive
                      ? [
                          BoxShadow(
                            color: const Color(AppConstants.primaryColorValue)
                                .withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : [],
                ),
                child: Text(
                  '$categoryIcon $categoryName',
                  style: TextStyle(
                    color: isActive
                        ? Colors.white
                        : const Color(AppConstants.darkBrownValue),
                    fontWeight: FontWeight.w600,
                    fontSize: isTablet ? 14 : 13,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SpinKitFoldingCube(
            color: Color(AppConstants.primaryColorValue),
            size: 50.0,
          ),
          SizedBox(height: 20),
          Text(
            'Loading delicious products...',
            style: TextStyle(
              fontSize: 16,
              color: Color(AppConstants.darkBrownValue),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppConstants.defaultPadding * 2),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline,
                size: 60,
                color: Colors.red,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Oops! Something went wrong',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(AppConstants.darkBrownValue),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              _errorMessage ?? 'Unknown error occurred',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[700],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 30),
            ElevatedButton.icon(
              onPressed: _loadProducts,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(AppConstants.primaryColorValue),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 30,
                  vertical: 15,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.all(AppConstants.defaultPadding * 2),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(AppConstants.goldAccentValue)
                  .withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.inventory_2_outlined,
              size: 60,
              color: Color(AppConstants.goldAccentValue),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'No Products in this Category',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(AppConstants.darkBrownValue),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Try selecting a different category!',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
