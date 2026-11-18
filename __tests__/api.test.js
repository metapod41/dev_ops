/**
 * __tests__/api.test.js
 * ----------------------------------------------------------------------------
 * Automated API tests (Jest + Supertest). These run in Jenkins, in GitHub
 * Actions and inside the Docker build stage — a failing test stops the build.
 * ----------------------------------------------------------------------------
 */

const request = require('supertest');
const app = require('../app');

// ============================================================================
// GET /
// ============================================================================
describe('GET /', () => {
  it('returns a welcome message with an endpoints listing', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Welcome/);
    expect(res.body).toHaveProperty('endpoints');
  });
});

// ============================================================================
// GET /todos and GET /todos/:id
// ============================================================================
describe('GET /todos', () => {
  it('returns an array of todos', async () => {
    const res = await request(app).get('/todos');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('each todo has id, title and completed', async () => {
    const res = await request(app).get('/todos');
    res.body.forEach((todo) => {
      expect(todo).toHaveProperty('id');
      expect(todo).toHaveProperty('title');
      expect(todo).toHaveProperty('completed');
    });
  });
});

describe('GET /todos/:id', () => {
  it('returns a single todo by id', async () => {
    const res = await request(app).get('/todos/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('returns 404 JSON for a missing id', async () => {
    const res = await request(app).get('/todos/9999');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================================================
// POST /todos
// ============================================================================
describe('POST /todos', () => {
  it('creates a todo and returns 201', async () => {
    const res = await request(app).post('/todos').send({ title: 'Write tests' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ title: 'Write tests', completed: false });
    expect(typeof res.body.id).toBe('number');
  });

  it('the created todo appears in the list', async () => {
    const created = await request(app).post('/todos').send({ title: 'Appears in list' });
    const res = await request(app).get('/todos');
    expect(res.body.some((t) => t.id === created.body.id)).toBe(true);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/todos').send({ foo: 'bar' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 on an empty body', async () => {
    const res = await request(app).post('/todos').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when title is an empty string or not a string', async () => {
    expect((await request(app).post('/todos').send({ title: '   ' })).statusCode).toBe(400);
    expect((await request(app).post('/todos').send({ title: 42 })).statusCode).toBe(400);
  });
});

// ============================================================================
// PATCH /todos/:id/toggle
// ============================================================================
describe('PATCH /todos/:id/toggle', () => {
  it('flips the completed flag', async () => {
    const before = (await request(app).get('/todos/2')).body.completed;
    const res = await request(app).patch('/todos/2/toggle');
    expect(res.statusCode).toBe(200);
    expect(res.body.completed).toBe(!before);
  });

  it('returns 404 for a missing id', async () => {
    const res = await request(app).patch('/todos/9999/toggle');
    expect(res.statusCode).toBe(404);
  });
});

// ============================================================================
// GET /health and GET /version
// ============================================================================
describe('GET /health', () => {
  it('returns status UP with uptime and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(typeof res.body.uptime).toBe('number');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});

describe('GET /version', () => {
  it('returns version and environment', async () => {
    const res = await request(app).get('/version');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('environment');
  });
});

// ============================================================================
// Unknown routes
// ============================================================================
describe('Unknown routes', () => {
  it('returns 404 JSON for an unknown route', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Route 'GET /does-not-exist' not found.");
  });
});
