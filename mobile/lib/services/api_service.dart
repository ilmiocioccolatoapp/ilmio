import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/product.dart';
import '../utils/constants.dart';

class ApiService {
  final String baseUrl = AppConstants.baseUrl;

  // Mock data flag - set to true to use mock data
  final bool useMockData = false;

  Future<List<Product>> fetchAvailableProducts() async {
    // Return mock data if flag is enabled
    if (useMockData) {
      await Future.delayed(
          const Duration(seconds: 1)); // Simulate network delay
      return _getMockProducts();
    }

    try {
      final response = await http.get(
        Uri.parse('$baseUrl${AppConstants.productsEndpoint}'),
        headers: {
          'Content-Type': 'application/json',
        },
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception(
              'Connection timeout. Please check your internet connection.');
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['success'] == true && data['data'] != null) {
          final List<dynamic> productsJson = data['data'];
          return productsJson.map((json) => Product.fromJson(json)).toList();
        } else {
          throw Exception('Invalid response format');
        }
      } else if (response.statusCode == 404) {
        throw Exception('Products not found');
      } else if (response.statusCode == 500) {
        throw Exception('Server error. Please try again later.');
      } else {
        throw Exception('Failed to load products: ${response.statusCode}');
      }
    } catch (e) {
      if (e.toString().contains('SocketException') ||
          e.toString().contains('NetworkException')) {
        throw Exception('No internet connection. Please check your network.');
      }
      rethrow;
    }
  }

  List<Product> _getMockProducts() {
    return [
      Product(
        id: '1',
        title: 'Chocolate Croissant',
        category: 'pastries',
        image:
            'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        description:
            'Our signature chocolate croissant is made with pure Belgian chocolate and our special flaky pastry dough that\'s prepared fresh every morning. Each bite delivers a perfect balance of buttery crispiness and rich chocolate flavor.',
        ingredients:
            'Flour, butter, Belgian chocolate, sugar, yeast, salt, eggs',
        price: '€3.50',
        available: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Product(
        id: '2',
        title: 'Hot Chocolate',
        category: 'drinks',
        image:
            'https://images.unsplash.com/photo-1574267432553-4b4628081c31?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        description:
            'Rich, creamy hot chocolate made with premium cocoa and steamed milk, topped with whipped cream and chocolate shavings.',
        ingredients:
            'Premium cocoa, whole milk, sugar, whipped cream, chocolate shavings',
        price: '€4.00',
        available: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Product(
        id: '3',
        title: 'Chocolate Tiramisu',
        category: 'desserts',
        image:
            'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        description:
            'Our twist on the classic Italian dessert, with layers of coffee-soaked ladyfingers, mascarpone cream, and rich chocolate.',
        ingredients:
            'Ladyfingers, mascarpone, espresso, cocoa powder, dark chocolate, eggs, sugar',
        price: '€5.50',
        available: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Product(
        id: '4',
        title: 'Chocolate Gelato',
        category: 'desserts',
        image:
            'https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        description:
            'Authentic Italian chocolate gelato made with premium cocoa and fresh milk. Creamy, rich, and intensely chocolatey.',
        ingredients: 'Whole milk, cream, sugar, premium cocoa, chocolate chips',
        price: '€3.50',
        available: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Product(
        id: '5',
        title: 'Chocolate Chip Cookie',
        category: 'pastries',
        image:
            'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        description:
            'Freshly baked chocolate chip cookies with a perfect balance of crisp edges and chewy centers, loaded with chocolate chunks.',
        ingredients:
            'Flour, butter, brown sugar, chocolate chunks, eggs, vanilla, baking soda',
        price: '€2.50',
        available: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Product(
        id: '6',
        title: 'Mocha Latte',
        category: 'drinks',
        image:
            'https://images.unsplash.com/photo-1517701604599-bb29b565090c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        description:
            'The perfect blend of rich espresso, steamed milk, and premium chocolate, topped with foam and a dusting of cocoa.',
        ingredients: 'Espresso, steamed milk, chocolate syrup, cocoa powder',
        price: '€4.50',
        available: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Product(
        id: '7',
        title: 'Chocolate Fondant',
        category: 'specialties',
        image:
            'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        description:
            'Warm chocolate cake with a molten chocolate center, served with a scoop of vanilla gelato and fresh berries.',
        ingredients:
            'Dark chocolate, butter, eggs, sugar, flour, vanilla gelato, fresh berries',
        price: '€6.50',
        available: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Product(
        id: '8',
        title: 'Chocolate Brioche',
        category: 'pastries',
        image:
            'https://images.unsplash.com/photo-1555507038-1d6ea43b99c1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        description:
            'Soft, buttery brioche filled with rich chocolate cream, perfect with your morning coffee.',
        ingredients: 'Flour, butter, eggs, milk, sugar, chocolate cream, yeast',
        price: '€3.00',
        available: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    ];
  }

  Future<Product> fetchProductById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/products/$id'),
        headers: {
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['success'] == true && data['data'] != null) {
          return Product.fromJson(data['data']);
        } else {
          throw Exception('Invalid response format');
        }
      } else {
        throw Exception('Failed to load product');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchCategories() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/categories'),
        headers: {
          'Content-Type': 'application/json',
        },
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Connection timeout');
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return List<Map<String, dynamic>>.from(data['data']);
        } else {
          throw Exception('Invalid response format');
        }
      } else {
        throw Exception('Failed to load categories');
      }
    } catch (e) {
      rethrow;
    }
  }
}
