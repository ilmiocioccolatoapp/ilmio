class Product {
  final String id;
  final String title;
  final String category;
  final String image;
  final String description;
  final String ingredients;
  final String price;
  final bool available;
  final DateTime createdAt;
  final DateTime updatedAt;

  Product({
    required this.id,
    required this.title,
    required this.category,
    required this.image,
    required this.description,
    required this.ingredients,
    required this.price,
    required this.available,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      category: json['category'] ?? '',
      image: json['image'] ?? '',
      description: json['description'] ?? '',
      ingredients: json['ingredients'] ?? '',
      price: json['price'] ?? '€0.00',
      available: json['available'] ?? true,
      createdAt:
          DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt:
          DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'title': title,
      'category': category,
      'image': image,
      'description': description,
      'ingredients': ingredients,
      'price': price,
      'available': available,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  String getCategoryEmoji() {
    switch (category.toLowerCase()) {
      case 'pastries':
        return '🥐';
      case 'drinks':
        return '☕';
      case 'desserts':
        return '🍰';
      case 'specialties':
        return '⭐';
      default:
        return '🍫';
    }
  }
}
