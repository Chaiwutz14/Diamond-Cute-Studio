/* Validated client for the trusted order-creation Worker. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DMCOrderPersistence = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  async function createFromWorker({ workerUrl, payload, fetcher, headers = {} } = {}) {
    const baseUrl = String(workerUrl || '').replace(/\/+$/, '');
    if (!baseUrl) throw Object.assign(new Error('Order service is not configured'), { code: 'ORDER_SERVICE_UNAVAILABLE' });
    if (typeof fetcher !== 'function') throw Object.assign(new Error('Order service is unavailable'), { code: 'ORDER_SERVICE_UNAVAILABLE' });

    let response;
    try {
      response = await fetcher(`${baseUrl}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw Object.assign(new Error('Order save request failed'), { code: 'ORDER_SAVE_FAILED', cause: error });
    }

    let body = null;
    try { body = await response.json(); } catch {}
    const docId = typeof body?.docId === 'string' ? body.docId.trim() : '';
    if (response?.ok !== true || body?.ok !== true || !docId) {
      throw Object.assign(new Error('Order save was not confirmed'), { code: 'ORDER_SAVE_NOT_CONFIRMED' });
    }

    const total = typeof body.total === 'number' && Number.isFinite(body.total) && body.total >= 0
      ? body.total
      : null;
    return { docId, total };
  }

  return { createFromWorker };
});
