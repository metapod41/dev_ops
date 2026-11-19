/**
 * data/todos.js
 * ----------------------------------------------------------------------------
 * In-memory data store for the Todo API.
 * There is no database: data lives in this array and resets on every restart.
 * ----------------------------------------------------------------------------
 */

// ============================================================================
// Seed data
// ============================================================================
const todos = [
  { id: 1, title: 'Set up Git repository', completed: true },
  { id: 2, title: 'Write Jenkins pipeline', completed: false },
  { id: 3, title: 'Deploy to Kubernetes', completed: false },
];

// Auto-increment counter for new todo IDs
let nextId = todos.length + 1;

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Return every todo.
 * @returns {Array<{id:number,title:string,completed:boolean}>}
 */
function getAllTodos() {
  return todos;
}

/**
 * Find a single todo by its numeric ID.
 * @param {number} id
 * @returns {object|undefined} the todo, or undefined if not found
 */
function getTodoById(id) {
  return todos.find((todo) => todo.id === id);
}

/**
 * Create a new todo and add it to the list.
 * @param {string} title
 * @returns {object} the created todo
 */
function addTodo(title) {
  const todo = { id: nextId++, title: title.trim(), completed: false };
  todos.push(todo);
  return todo;
}

/**
 * Flip the `completed` flag of a todo.
 * @param {number} id
 * @returns {object|undefined} the updated todo, or undefined if not found
 */
function toggleTodo(id) {
  const todo = getTodoById(id);
  if (todo) {
    todo.completed = !todo.completed;
  }
  return todo;
}

/**
 * Count todos by status.
 * @returns {{total:number, completed:number, pending:number}}
 */
function getStats() {
  const completed = todos.filter((todo) => todo.completed).length;
  return { total: todos.length, completed, pending: todos.length - completed };
}

module.exports = { getAllTodos, getTodoById, addTodo, toggleTodo, getStats };
