import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  final ApiService _apiService = ApiService();
  final PageController _pageController = PageController();
  Timer? _autoAdvanceTimer;

  List<Product> _allProducts = [];
  List<Product> _filteredProducts = [];
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = true;
  String? _errorMessage;
  int _currentPage = 0;
  String _selectedCategory = 'all';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _autoAdvanceTimer?.cancel();
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
        _startAutoAdvance();
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

  void _startAutoAdvance() {
    _autoAdvanceTimer?.cancel();
    _autoAdvanceTimer =
        Timer.periodic(AppConstants.autoAdvanceDuration, (timer) {
      if (_filteredProducts.isNotEmpty &&
          mounted &&
          _pageController.hasClients) {
        final nextPage = (_currentPage + 1) % _filteredProducts.length;
        _pageController.animateToPage(
          nextPage,
          duration: AppConstants.pageTransitionDuration,
          curve: Curves.easeInOut,
        );
      }
    });
  }

  void _filterByCategory(String categoryId) {
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

    if (_filteredProducts.isNotEmpty && _pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
    _startAutoAdvance();
  }

  void _navigateToPage(int index) {
    if (_pageController.hasClients) {
      _pageController.animateToPage(
        index,
        duration: AppConstants.pageTransitionDuration,
        curve: Curves.easeInOut,
      );
      _startAutoAdvance();
    }
  }

  void _previousImage() {
    if (_currentPage > 0) {
      _navigateToPage(_currentPage - 1);
    }
  }

  void _nextImage() {
    if (_currentPage < _filteredProducts.length - 1) {
      _navigateToPage(_currentPage + 1);
    }
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
                : Column(
                    children: [
                      _buildHeader(isTablet),
                      Expanded(
                        child: RefreshIndicator(
                          onRefresh: _loadProducts,
                          color: const Color(AppConstants.primaryColorValue),
                          child: _buildMainContent(isTablet),
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }

  double _getHeaderHeight(bool isTablet) {
    return MediaQuery.of(context).padding.top + (isTablet ? 72 : 52);
  }

  Widget _buildMainContent(bool isTablet) {
    if (isTablet) {
      // Tablet layout - side by side
      return SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height:
              MediaQuery.of(context).size.height - _getHeaderHeight(isTablet),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    _buildCategoryButtons(isTablet),
                    const SizedBox(height: 12),
                    if (_filteredProducts.isEmpty)
                      Expanded(child: _buildEmptyState())
                    else
                      Expanded(child: _buildGalleryContainer(isTablet)),
                  ],
                ),
              ),
              if (_filteredProducts.isNotEmpty)
                SizedBox(
                  width: 400,
                  child: SingleChildScrollView(
                    child: _buildFoodInfo(isTablet),
                  ),
                ),
            ],
          ),
        ),
      );
    }

    // Phone layout - stacked
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: SizedBox(
        height: MediaQuery.of(context).size.height - _getHeaderHeight(isTablet),
        child: Column(
          children: [
            const SizedBox(height: 12),
            _buildCategoryButtons(isTablet),
            const SizedBox(height: 12),
            if (_filteredProducts.isEmpty)
              Expanded(child: _buildEmptyState())
            else
              Expanded(
                child: Column(
                  children: [
                    Expanded(child: _buildGalleryContainer(isTablet)),
                    _buildFoodInfo(isTablet),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isTablet) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + (isTablet ? 12 : 8),
        bottom: isTablet ? 20 : 12,
        left: isTablet ? 40 : 20,
        right: isTablet ? 40 : 20,
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
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.restaurant_menu,
            color: const Color(AppConstants.goldAccentValue),
            size: isTablet ? 32 : 22,
          ),
          SizedBox(width: isTablet ? 12 : 8),
          Text(
            AppConstants.appName,
            style: TextStyle(
              fontSize: isTablet ? 28 : 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(width: 8),
          const Icon(
            Icons.coffee,
            color: Color(AppConstants.goldAccentValue),
            size: 22,
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryButtons(bool isTablet) {
    if (_categories.isEmpty) {
      return const SizedBox.shrink();
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: EdgeInsets.symmetric(horizontal: isTablet ? 40 : 20),
      child: Row(
        children: _categories.map((category) {
          final categoryId = category['id'] as String;
          final categoryName = category['name'] as String;
          final categoryIcon = category['icon'] as String;
          final isActive = categoryId == _selectedCategory;

          return Padding(
            padding: EdgeInsets.only(right: isTablet ? 16 : 12),
            child: GestureDetector(
              onTap: () => _filterByCategory(categoryId),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding: EdgeInsets.symmetric(
                  horizontal: isTablet ? 28 : 20,
                  vertical: isTablet ? 14 : 10,
                ),
                decoration: BoxDecoration(
                  color: isActive
                      ? const Color(AppConstants.primaryColorValue)
                      : const Color(0xFFE8D0B3),
                  borderRadius: BorderRadius.circular(30),
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
                    fontSize: isTablet ? 16 : 14,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildGalleryContainer(bool isTablet) {
    if (_filteredProducts.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
              _startAutoAdvance();
            },
            itemCount: _filteredProducts.length,
            itemBuilder: (context, index) {
              return _buildMainImage(_filteredProducts[index]);
            },
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    const Color(AppConstants.darkBrownValue)
                        .withValues(alpha: 0.8),
                  ],
                ),
              ),
              child: Text(
                _filteredProducts[_currentPage].title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          if (_currentPage > 0)
            Positioned(
              left: 20,
              top: 0,
              bottom: 0,
              child: Center(
                child: _buildNavButton(
                  Icons.chevron_left,
                  _previousImage,
                ),
              ),
            ),
          if (_currentPage < _filteredProducts.length - 1)
            Positioned(
              right: 20,
              top: 0,
              bottom: 0,
              child: Center(
                child: _buildNavButton(
                  Icons.chevron_right,
                  _nextImage,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMainImage(Product product) {
    return CachedNetworkImage(
      imageUrl: product.image,
      fit: BoxFit.cover,
      placeholder: (context, url) => Container(
        color: const Color(AppConstants.darkBrownValue).withValues(alpha: 0.1),
        child: const Center(
          child: SpinKitFoldingCube(
            color: Color(AppConstants.primaryColorValue),
            size: 50.0,
          ),
        ),
      ),
      errorWidget: (context, url, error) => Container(
        color: const Color(AppConstants.darkBrownValue).withValues(alpha: 0.1),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.broken_image,
              size: 60,
              color: Color(AppConstants.darkBrownValue),
            ),
            SizedBox(height: 10),
            Text(
              'Image not available',
              style: TextStyle(
                color: Color(AppConstants.darkBrownValue),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavButton(IconData icon, VoidCallback onPressed) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.7),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(
          icon,
          color: const Color(AppConstants.darkBrownValue),
          size: 24,
        ),
      ),
    );
  }

  Widget _buildFoodInfo(bool isTablet) {
    if (_filteredProducts.isEmpty) return const SizedBox.shrink();

    final product = _filteredProducts[_currentPage];

    return Container(
      margin: EdgeInsets.all(isTablet ? 24 : 16),
      padding: EdgeInsets.all(isTablet ? 24 : 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(isTablet ? 16 : 12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'About Our ${product.title}',
            style: TextStyle(
              fontSize: isTablet ? 20 : 16,
              fontWeight: FontWeight.bold,
              color: const Color(AppConstants.primaryColorValue),
            ),
          ),
          SizedBox(height: isTablet ? 12 : 8),
          Text(
            product.description,
            style: TextStyle(
              fontSize: isTablet ? 16 : 13,
              color: Colors.grey[800],
              height: 1.4,
            ),
            maxLines: isTablet ? 4 : 2,
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: isTablet ? 16 : 12),
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: isTablet ? 20 : 16,
              vertical: isTablet ? 14 : 10,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(AppConstants.goldAccentValue),
                  const Color(AppConstants.goldAccentValue)
                      .withValues(alpha: 0.8),
                ],
              ),
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: const Color(AppConstants.goldAccentValue)
                      .withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Price',
                  style: TextStyle(
                    fontSize: isTablet ? 16 : 14,
                    fontWeight: FontWeight.w600,
                    color: const Color(AppConstants.darkBrownValue),
                  ),
                ),
                Text(
                  product.price,
                  style: TextStyle(
                    fontSize: isTablet ? 22 : 18,
                    fontWeight: FontWeight.bold,
                    color: const Color(AppConstants.darkBrownValue),
                  ),
                ),
              ],
            ),
          ),
        ],
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
