/* Shared, side-effect-free cart total calculations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DMCOrderCalculations = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function computeTotals({ itemCount = 0, subtotal = 0, fees = {}, payment = 'promptpay', coupon = null } = {}) {
    const safeSubtotal = Number.isFinite(Number(subtotal)) ? Math.max(0, Number(subtotal)) : 0;
    if (!Number(itemCount)) {
      return { subtotal: 0, shipping: 0, surcharge: 0, discount: 0, freeship: false, total: 0 };
    }

    const isCod = payment === 'cod';
    let shipping = Number(isCod ? fees.shipCod : fees.shipTransfer) || 0;
    const surcharge = Number(isCod ? fees.surchargeCod : fees.surchargePromptpay) || 0;
    let discount = 0;
    let freeship = false;

    if (coupon?.type === 'percent') {
      const value = Math.max(0, Number(coupon.value) || 0);
      discount = Math.floor(safeSubtotal * value / 100);
      const cap = Math.max(0, Number(coupon.maxDiscount) || 0);
      if (cap > 0) discount = Math.min(discount, cap);
    } else if (coupon?.type === 'fixed') {
      discount = Math.min(Math.max(0, Number(coupon.value) || 0), safeSubtotal);
    } else if (coupon?.type === 'freeship') {
      freeship = true;
    }

    const freeShipMin = Math.max(0, Number(fees.freeShipMin) || 0);
    if (freeship || (freeShipMin > 0 && safeSubtotal >= freeShipMin)) shipping = 0;
    const total = Math.max(0, safeSubtotal + shipping + surcharge - discount);
    return { subtotal: safeSubtotal, shipping, surcharge, discount, freeship, total };
  }

  return { computeTotals };
});
