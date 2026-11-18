# ================================================
# Dockerfile — multi-stage build for todo-api
# ------------------------------------------------
# Why multi-stage? Stage 1 installs ALL dependencies (including Jest and
# Supertest) and runs the tests, so a broken build never produces an image.
# Stage 2 starts from a clean base and installs only production dependencies,
# then copies just the files the app needs to run. Dev tools, tests and the
# npm cache are left behind in stage 1, so the final image is smaller and has
# less attack surface.
# ================================================

# ---------- Stage 1: install deps + run tests ---
FROM node:18-alpine AS build
WORKDIR /app

# Copy manifests first so this layer is cached until dependencies change
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm test

# ---------- Stage 2: slim runtime image ---------
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only what the app needs at runtime, from the tested build stage
COPY --from=build /app/app.js /app/server.js ./
COPY --from=build /app/data ./data

# Run as the non-root "node" user that ships with the official image
USER node

EXPOSE 3000

# Docker marks the container unhealthy if /health stops answering
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
