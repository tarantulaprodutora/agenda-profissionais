# Single stage - simpler and guaranteed to work
FROM node:22-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install pnpm and ALL dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build frontend and backend
RUN pnpm build

# Verify build output exists
RUN ls -la dist/ && ls -la dist/public/ && echo "Build OK!"

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
