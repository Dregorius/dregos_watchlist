# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Production server
FROM node:18-alpine
# Build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
COPY --from=frontend-builder /app/dist ./public
RUN mkdir -p /app/data && chown -R node:node /app
EXPOSE 3000
# Run as non-root user (principle of least privilege)
USER node
CMD ["node", "server.js"]
