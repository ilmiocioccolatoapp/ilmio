import 'package:flutter_test/flutter_test.dart';
import 'package:il_mio_cioccolato/services/api_service.dart';

void main() {
  test('published menu maps size and add-on prices and availability', () async {
    final api = PublishedBrandApi({
      'currency': 'AED',
      'categories': [
        {
          'id': 'drinks',
          'items': [
            {
              'id': 'latte',
              'name': 'Latte',
              'priceAmount': '10.00',
              'currency': 'AED',
              'availability': 'available',
              'sizes': [
                {
                  'id': 'small',
                  'name': 'Small',
                  'priceAmount': '10.00',
                  'available': true
                },
                {
                  'id': 'large',
                  'name': 'Large',
                  'priceAmount': '14.00',
                  'available': false
                }
              ],
              'addOnGroups': [
                {
                  'id': 'milk',
                  'name': 'Milk options',
                  'selection': 'single',
                  'options': [
                    {
                      'id': 'oat',
                      'name': 'Oat milk',
                      'priceAmount': '2.00',
                      'available': false
                    }
                  ]
                }
              ],
              'createdAt': '2026-01-01T00:00:00.000Z',
              'updatedAt': '2026-01-01T00:00:00.000Z'
            }
          ]
        }
      ]
    });

    final products = await api.fetchAvailableProducts();
    expect(products.single.startingSize?.price, 'AED 10.00');
    expect(products.single.sizes.last.available, isFalse);
    expect(products.single.addOnGroups.single.options.single.price, 'AED 2.00');
    expect(
        products.single.addOnGroups.single.options.single.available, isFalse);
  });
}
