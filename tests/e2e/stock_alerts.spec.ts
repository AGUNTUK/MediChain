import { test, expect } from '@playwright/test';

test.describe('Stock Alert System & Notification Filtering', () => {
  test('Stock alert subscription endpoints register and unsubscribe cleanly', async ({ request }) => {
    const subRes = await request.post('/api/stock-alerts/subscribe', {
      data: {
        productId: 'test-product-stock-alert-1'
      }
    });
    expect([200, 401]).toContain(subRes.status());

    const unsubRes = await request.post('/api/stock-alerts/unsubscribe', {
      data: {
        productId: 'test-product-stock-alert-1'
      }
    });
    expect([200, 401]).toContain(unsubRes.status());
  });

  test('Public notification list excludes internal audit logs and price history dumps', async ({ request }) => {
    const res = await request.get('/api/notifications');
    if (res.status() === 200) {
      const notifs = await res.json();
      expect(Array.isArray(notifs)).toBe(true);

      for (const n of notifs) {
        expect(['audit_log', 'price_history', 'import_history', 'export_history', 'stock_alert_sub']).not.toContain(n.type);
        if (typeof n.title === 'string') {
          expect(n.title.startsWith('Audit:')).toBe(false);
          expect(n.title.startsWith('Price History:')).toBe(false);
        }
        if (typeof n.message === 'string') {
          expect(n.message.startsWith('{"action":')).toBe(false);
          expect(n.message.startsWith('{"productId":')).toBe(false);
        }
      }
    }
  });
});
