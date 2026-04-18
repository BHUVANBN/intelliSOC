# ════════════════════════════════════════════════
# Dashboard Dockerfile — React SOC UI
# ════════════════════════════════════════════════
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps

COPY public/ ./public/
COPY src/ ./src/

ARG REACT_APP_API_URL=http://localhost:8001
ARG REACT_APP_WS_URL=ws://localhost:8001/ws/alerts

RUN npm run build

# ─── Serve with nginx ────────────────────────────
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
