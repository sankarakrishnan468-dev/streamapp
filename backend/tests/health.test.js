import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server.js';

test('health endpoint returns service status', async () => {
  const response = await request(createApp()).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('invalid stream IDs return not found instead of an internal server error', async () => {
  const response = await request(createApp()).get('/api/streams/not-a-mongodb-id');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'The requested resource was not found');
});
