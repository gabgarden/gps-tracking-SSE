FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY services/backend ./services/backend
RUN npm install
WORKDIR /app/services/backend
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY services/backend/package.json ./services/backend/
RUN npm install --omit=dev --workspace=@gps-tracking/backend
COPY --from=build /app/services/backend/dist ./services/backend/dist

WORKDIR /app/services/backend
CMD ["npm", "start"]
