FROM node:20-alpine AS builder
WORKDIR /app

# VITE_API_URL is baked into the bundle at build time.
# Pass it via docker-compose build args so it can differ per environment.
# All other VITE_* vars come from frontend/.env.production (copied below).
ARG VITE_API_URL=http://localhost:8888
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ── Serve stage ────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
