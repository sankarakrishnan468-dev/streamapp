import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp, isAllowedOrigin } from '../server.js';

test('isAllowedOrigin permits production Netlify and local dev origins while blocking untrusted origins', () => {
  assert.equal(isAllowedOrigin('https://lively-caramel-4dddfe.netlify.app'), true);
  assert.equal(isAllowedOrigin('https://lively-caramel-4dddfe.netlify.app/'), true);
  assert.equal(isAllowedOrigin('http://localhost:5173'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:5173'), true);
  assert.equal(isAllowedOrigin(undefined), true);
  assert.equal(isAllowedOrigin('https://malicious-attacker.com'), false);
});

test('private meeting endpoint requires authentication', async () => {
  const app = createApp();
  const response = await request(app).get('/api/meetings/test-room');
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Authentication required');
});

test('media token endpoint requires authentication', async () => {
  const app = createApp();
  const response = await request(app).post('/api/meetings/test-room/media-token').send({ sessionId: 'session123456789012' });
  assert.equal(response.status, 401);
});

test('media token endpoint rejects unauthenticated request with 401', async () => {
  const app = createApp();
  const response = await request(app).post('/api/meetings/any-room/media-token');
  assert.equal(response.status, 401);
});
