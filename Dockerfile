# --- Frontend container (Vite build -> static server) ---

FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_AGENT_PANEL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AGENT_PANEL=$VITE_AGENT_PANEL

COPY package*.json ./

# Install deps (ci is faster/safer than install when lockfile exists)
RUN npm ci --no-fund --no-audit

COPY . .

# Build
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl
RUN npm install -g serve

COPY --from=build /app/dist /app/dist
RUN printf "ok" > /app/dist/health

RUN chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["serve", "-s", "/app/dist", "-l", "3000"]
