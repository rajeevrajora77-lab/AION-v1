FROM node:20-alpine
WORKDIR /app
RUN addgroup --system aion && adduser --system --group aion
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER aion
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "server.js"]
