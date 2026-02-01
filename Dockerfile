FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Health check removed - Cloud Run provides its own health checks

# Start the server
CMD ["node", "src/index.js"]
