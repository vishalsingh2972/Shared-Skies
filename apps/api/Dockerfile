FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS dev
WORKDIR /app/apps/api
COPY apps/api/package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]