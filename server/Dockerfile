FROM node:20-alpine

RUN apk add --no-cache ca-certificates openssl curl

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN if [ -f package-lock.json ]; then npm ci --no-fund --no-audit; else npm install --no-fund --no-audit; fi

COPY . .

RUN npx prisma generate
RUN npm run build

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 8787

RUN chown -R node:node /app
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:8787/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm","run","start"]
