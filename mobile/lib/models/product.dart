class ProductSize {
  final String id;
  final String name;
  final String price;
  final double amount;
  final bool available;

  const ProductSize({
    required this.id,
    required this.name,
    required this.price,
    required this.amount,
    required this.available,
  });

  factory ProductSize.fromJson(Map<String, dynamic> json) => ProductSize(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        price: json['price'] ?? '',
        amount: (json['amount'] as num?)?.toDouble() ?? 0,
        available: json['available'] != false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        'amount': amount,
        'available': available,
      };
}

class ProductAddOn {
  final String id;
  final String name;
  final String price;
  final bool available;

  const ProductAddOn({
    required this.id,
    required this.name,
    required this.price,
    required this.available,
  });

  factory ProductAddOn.fromJson(Map<String, dynamic> json) => ProductAddOn(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        price: json['price'] ?? '',
        available: json['available'] != false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        'available': available,
      };
}

class ProductAddOnGroup {
  final String id;
  final String name;
  final String selection;
  final List<ProductAddOn> options;

  const ProductAddOnGroup({
    required this.id,
    required this.name,
    required this.selection,
    required this.options,
  });

  factory ProductAddOnGroup.fromJson(Map<String, dynamic> json) =>
      ProductAddOnGroup(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        selection: json['selection'] ?? 'multiple',
        options: (json['options'] as List? ?? [])
            .map((option) =>
                ProductAddOn.fromJson(Map<String, dynamic>.from(option as Map)))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'selection': selection,
        'options': options.map((option) => option.toJson()).toList(),
      };
}

class Product {
  final String id;
  final String title;
  final String category;
  final String image;
  final String description;
  final String ingredients;
  final String price;
  final bool available;
  final List<ProductSize> sizes;
  final List<ProductAddOnGroup> addOnGroups;
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
    this.sizes = const [],
    this.addOnGroups = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  ProductSize? get startingSize {
    final availableSizes = sizes.where((size) => size.available).toList();
    if (availableSizes.isEmpty) return null;
    availableSizes.sort((a, b) => a.amount.compareTo(b.amount));
    return availableSizes.first;
  }

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
      sizes: (json['sizes'] as List? ?? [])
          .map((size) =>
              ProductSize.fromJson(Map<String, dynamic>.from(size as Map)))
          .toList(),
      addOnGroups: (json['addOnGroups'] as List? ?? [])
          .map((group) => ProductAddOnGroup.fromJson(
              Map<String, dynamic>.from(group as Map)))
          .toList(),
      createdAt: DateTime.parse(
        json['createdAt'] ?? DateTime.now().toIso8601String(),
      ),
      updatedAt: DateTime.parse(
        json['updatedAt'] ?? DateTime.now().toIso8601String(),
      ),
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
      'sizes': sizes.map((size) => size.toJson()).toList(),
      'addOnGroups': addOnGroups.map((group) => group.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
