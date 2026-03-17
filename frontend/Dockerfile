FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install \
    && chmod +x node_modules/.bin/vite node_modules/vite/bin/vite.js

COPY index.html ./
COPY vite.config.js ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
