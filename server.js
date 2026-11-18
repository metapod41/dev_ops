/**
 * server.js
 * ----------------------------------------------------------------------------
 * Entry point: load the Express app and start listening on PORT.
 * ----------------------------------------------------------------------------
 */

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Todo API running at http://localhost:${PORT}`);
});
