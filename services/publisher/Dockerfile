FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY services ./services

RUN npm ci
RUN npm run build -w @gps-tracking/publisher

FROM node:22-alpine

WORKDIR /app/services/publisher
ENV NODE_ENV=production

COPY --from=build /app/services/publisher/dist ./dist

CMD ["node", "dist/main/main.js"]
