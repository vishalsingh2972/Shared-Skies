FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS dev
WORKDIR /app/apps/socket-server
COPY apps/socket-server/package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]