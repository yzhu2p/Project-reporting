# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend packages and install
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source files and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Run the Express backend
FROM node:20-alpine
WORKDIR /app

# Copy backend packages and install (omit dev dependencies if any)
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source files
COPY src/ ./src/

# Copy the compiled React static files from the first stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose backend port
EXPOSE 5000

# Run backend server
CMD ["node", "src/server.js"]
