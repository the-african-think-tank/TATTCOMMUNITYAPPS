# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# su-exec is used in the docker-compose entrypoint to drop from root → node
# after fixing upload directory ownership on the mounted volume
RUN apk add --no-cache su-exec

# Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Pre-create the uploads directory tree with correct ownership.
# When docker-compose bind-mounts ./server/uploads → /app/uploads,
# the host directory takes precedence. Run the fix-permissions entrypoint
# to ensure the node user can always write regardless of host ownership.
RUN mkdir -p /app/uploads/image /app/uploads/video /app/uploads/audio /app/uploads/document \
    && chown -R node:node /app/uploads

# Set uploads to an absolute path to avoid CWD-relative issues
ENV UPLOAD_DIR=/app/uploads

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
