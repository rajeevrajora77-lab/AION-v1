# Multi-stage build for production
FROM node:18-alpine AS base

# Install Python for dual backend support
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY backend/python_backend/requirements.txt ./backend/python_backend/

# Install dependencies
WORKDIR /app/backend
RUN npm ci --only=production
RUN pip3 install --no-cache-dir -r python_backend/requirements.txt

# Copy application code
COPY backend/ .

# Expose ports
EXPOSE 5000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start both Node.js and Python backends
CMD ["sh", "-c", "python3 python_backend/main.py & npm start"]
