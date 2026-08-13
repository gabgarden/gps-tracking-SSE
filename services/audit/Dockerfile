FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY services ./services

RUN npm ci
RUN npm run build -w @gps-tracking/shared
RUN npm run build -w @gps-tracking/audit

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY services/backend/package.json ./services/backend/package.json
COPY services/audit/package.json ./services/audit/package.json
COPY services/publisher/package.json ./services/publisher/package.json

RUN npm ci --omit=dev \
  && node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('shared/package.json','utf8')); p.exports['./audit']='./dist/audit/index.js'; fs.writeFileSync('shared/package.json', JSON.stringify(p, null, 2));"

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/services/audit/dist ./services/audit/dist

WORKDIR /app/services/audit
EXPOSE 8081
CMD ["node", "dist/main/main.js"]
