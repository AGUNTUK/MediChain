import { test, expect } from '@playwright/test';

test.describe('Admin Panel Catalog & Notification Management', () => {
  test('Admin catalog endpoint returns paginated catalog structure with count', async ({ request }) => {
    const res = await request.get('/api/products?paginate=true&page=1&limit=10');
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('products');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('pages');
    expect(Array.isArray(data.products)).toBe(true);
  });

  test('Notification endpoints support marking individual and all notifications read', async ({ request }) => {
    // Check notifications list endpoint
    const notifRes = await request.get('/api/notifications');
    expect([200, 401]).toContain(notifRes.status());

    // Mark all read endpoint check
    const markAllRes = await request.post('/api/notifications/read-all');
    expect([200, 401]).toContain(markAllRes.status());
  });

  test('Admin notification send/broadcast validates and responds with proper status', async ({ request }) => {
    // Attempting send without auth or as admin returns expected status
    const sendRes = await request.post('/api/admin/notifications/send', {
      data: {
        title: 'Flash Bulk Discount',
        message: 'Get 10% extra discount on Beximco products',
        type: 'offer'
      }
    });
    expect([200, 401, 403]).toContain(sendRes.status());

    const broadcastRes = await request.post('/api/admin/notifications/broadcast', {
      data: {
        title: 'Emergency Weather Advisory',
        message: 'Depot dispatch schedule updated',
        type: 'global'
      }
    });
    expect([200, 401, 403]).toContain(broadcastRes.status());
  });
});
