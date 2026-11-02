/* Count catalog entries for built-in and owner-created category filters. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DMCCategoryAvailability = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function summarize(categories, products) {
    const activeProducts = Array.isArray(products) ? products.filter(product => product && product.active !== false) : [];
    return (Array.isArray(categories) ? categories : []).map(category => {
      const slug = String(category?.slug || '').trim();
      const name = String(category?.name || '').trim();
      if (!slug || !name) return null;
      const aliases = [slug, name, ...(Array.isArray(category.match) ? category.match : [])]
        .map(value => String(value || '').trim().toLowerCase())
        .filter(Boolean);
      const count = activeProducts.filter(product => aliases.includes(String(product.category || '').trim().toLowerCase())).length;
      return { slug, name, icon: category.icon || 'grid', count, custom: Boolean(category.custom) };
    }).filter(Boolean);
  }

  return { summarize };
});
