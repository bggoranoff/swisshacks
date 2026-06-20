FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
RUN cd server && npx tsc
COPY --from=client-build /app/client/dist ./client/dist
COPY data/ ./data/
EXPOSE 3000
CMD ["node", "-r", "dotenv/config", "server/dist/index.js"]
