FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system aion && adduser --system --group aion
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --production
USER aion
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s CMD wget -qO- http://localhost:5000/api/health || exit 1
CMD ["node", "dist/server.js"]
