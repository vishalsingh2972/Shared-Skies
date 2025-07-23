FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS dev
WORKDIR /app/apps/web
COPY apps/web/package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]