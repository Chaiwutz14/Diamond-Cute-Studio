/* Shared customer-facing shipping summary. Fee values follow CMS, then config defaults. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DMCShippingDisplay = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function amount(value, fallback) {
    if (value === undefined || value === null || value === '') value = fallback;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function price(value) {
    return '฿' + new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(value);
  }

  function format(fees, shipping) {
    const source = fees || {};
    const defaults = shipping || {};
    const transfer = amount(source.shipTransfer, defaults.transfer);
    const cod = amount(source.shipCod, defaults.cod);
    const freeShipMin = amount(source.freeShipMin, 0);
    const details = [];

    if (transfer !== null) details.push('โอน/PromptPay ' + price(transfer));
    if (cod !== null) details.push('เก็บเงินปลายทาง (COD รวมค่าธรรมเนียม) ' + price(cod));
    if (freeShipMin > 0) details.push('ส่งฟรีเมื่อยอดสินค้าตั้งแต่ ' + price(freeShipMin));
    return details.join(' · ') || 'ดูค่าจัดส่งในหน้าสั่งซื้อ';
  }

  return { format };
});
