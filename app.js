/**
 * app.js
 * ----------------------------------------------------------------------------
 * Express application for the Todo API.
 * The app is exported (without calling listen) so Jest/Supertest can test it.
 * server.js is the real entry point that starts the HTTP server.
 * ----------------------------------------------------------------------------
 */

const express = require('express');
const { getAllTodos, getTodoById, addTodo, toggleTodo, getStats } = require('./data/todos');

const app = express();

// ============================================================================
// Middleware
// ============================================================================
app.use(express.json()); // parse JSON request bodies

// ============================================================================
// Routes — General
// ============================================================================

/**
 * GET /
 * Welcome message with a list of available endpoints.
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Todo API!',
    endpoints: {
      'GET /todos': 'List all todos',
      'GET /todos/stats': 'Count of total, completed and pending todos',
      'GET /todos/:id': 'Get a single todo by ID',
      'POST /todos': 'Create a todo. Body: { "title": "..." }',
      'PATCH /todos/:id/toggle': 'Toggle the completed flag of a todo',
      'GET /hello?name=': 'Friendly greeting',
      'GET /health': 'Health check (used by Kubernetes probes)',
      'GET /version': 'App version and environment (from ConfigMap)',
    },
  });
});

// ============================================================================
// Routes — Todos
// ============================================================================

/**
 * GET /todos
 * Return every todo.
 */
app.get('/todos', (req, res) => {
  res.json(getAllTodos());
});

/**
 * GET /todos/stats
 * Return how many todos exist, how many are completed and how many are pending.
 * Declared before /todos/:id so "stats" is not treated as an id.
 */
app.get('/todos/stats', (req, res) => {
  res.json(getStats());
});

/**
 * GET /todos/:id
 * Return a single todo, or 404 if it does not exist.
 */
app.get('/todos/:id', (req, res) => {
  const todo = getTodoById(Number(req.params.id));
  if (!todo) {
    return res.status(404).json({ error: `Todo with id ${req.params.id} not found.` });
  }
  res.json(todo);
});

/**
 * POST /todos
 * Create a new todo. Body: { "title": "..." }
 * Returns 201 with the created todo, or 400 if the title is invalid.
 */
app.post('/todos', (req, res) => {
  const { title } = req.body || {};
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Field "title" is required and must be a non-empty string.' });
  }
  res.status(201).json(addTodo(title));
});

/**
 * PATCH /todos/:id/toggle
 * Flip the completed flag of a todo, or 404 if it does not exist.
 */
app.patch('/todos/:id/toggle', (req, res) => {
  const todo = toggleTodo(Number(req.params.id));
  if (!todo) {
    return res.status(404).json({ error: `Todo with id ${req.params.id} not found.` });
  }
  res.json(todo);
});

// ============================================================================
// Routes — Feature: greeting (added on feature/hello-endpoint)
// ============================================================================

/**
 * GET /hello?name=Alice
 * Return a greeting. `name` is optional and defaults to "World".
 */
app.get('/hello', (req, res) => {
  const name = req.query.name || 'World';
  res.json({ message: `Hello, ${name}!` });
});

// ============================================================================
// Routes — Operations (health + version)
// ============================================================================

/**
 * GET /health
 * Liveness/readiness endpoint used by Kubernetes probes and monitoring.
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /version
 * Report the app version and environment. In Kubernetes these values come
 * from the todo-api-config ConfigMap, which proves the ConfigMap is wired in.
 */
app.get('/version', (req, res) => {
  res.json({
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.APP_ENV || 'development',
  });
});

// ============================================================================
// Catch-all 404
// ============================================================================
app.use((req, res) => {
  res.status(404).json({ error: `Route '${req.method} ${req.path}' not found.` });
});

module.exports = app;
