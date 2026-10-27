import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { productService, categoryService } from '../services/api';
import { createResource } from './resource';

const CatalogContext = createContext(null);
const idOf = item => item._id || item.dbId || item.id;
const upsert = (items, item) => [item, ...items.filter(existing => idOf(existing) !== idOf(item))];

export function CatalogProvider({ children }) {
  const [resources] = useState(() => ({
    products: createResource(async () => (await productService.getAllProducts()).data || []),
    categories: createResource(() => categoryService.getAllCategories())
  }));
  const productState = useSyncExternalStore(resources.products.subscribe, resources.products.getSnapshot);
  const categoryState = useSyncExternalStore(resources.categories.subscribe, resources.categories.getSnapshot);

  useEffect(() => {
    const refresh = () => {
      resources.products.refresh().catch(() => {});
      resources.categories.refresh().catch(() => {});
    };
    refresh();
    // Revisit cached views immediately; refresh stale data when returning to the app.
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [resources]);

  const actions = useMemo(() => ({
    async saveProduct(id, payload) {
      if (resources.products.getSnapshot().data === null) await resources.products.refresh();
      const result = id
        ? await productService.updateProduct(id, payload)
        : await productService.createProduct(payload);
      resources.products.update(items => upsert(items, result.data));
    },
    async toggleProduct(id) {
      const result = await productService.toggleAvailability(id);
      resources.products.update(items => upsert(items, result.data));
    },
    async deleteProduct(id) {
      await productService.deleteProduct(id);
      resources.products.update(items => items.filter(item => idOf(item) !== id));
    },
    async saveCategory(id, payload) {
      if (resources.categories.getSnapshot().data === null) await resources.categories.refresh();
      const result = id
        ? await categoryService.updateCategory(id, payload)
        : await categoryService.createCategory(payload);
      resources.categories.update(items => upsert(items, result.data));
    },
    async deleteCategory(id) {
      await categoryService.deleteCategory(id);
      resources.categories.update(items => items.filter(item => item.id !== id));
    },
    refreshProducts: () => resources.products.refresh(true),
    refreshCategories: () => resources.categories.refresh(true)
  }), [resources]);

  const value = useMemo(() => {
    const categories = [...(categoryState.data || [])].sort((a, b) => a.order - b.order);
    const order = new Map(categories.map((category, index) => [category.id, index]));
    const products = [...(productState.data || [])].sort((a, b) =>
      ((order.get(a.category) ?? 999) - (order.get(b.category) ?? 999)) ||
      (new Date(b.createdAt) - new Date(a.createdAt)));
    const counts = products.reduce((result, product) => {
      result[product.category] = (result[product.category] || 0) + 1;
      return result;
    }, {});
    return {
      products,
      categories: categories.map(category => productState.data === null ? category : {
        ...category, count: counts[category.id] || 0
      }),
      productsLoading: productState.data === null && !productState.error,
      categoriesLoading: categoryState.data === null && !categoryState.error,
      productsError: productState.error,
      categoriesError: categoryState.error,
      ...actions
    };
  }, [productState, categoryState, actions]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error('Catalog views must be inside CatalogProvider.');
  return catalog;
}
