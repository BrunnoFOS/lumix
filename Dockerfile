# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholders para o build — serão substituídos em runtime
ENV NEXT_PUBLIC_SUPABASE_URL=NEXT_PUBLIC_SUPABASE_URL_PLACEHOLDER
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=NEXT_PUBLIC_SUPABASE_ANON_KEY_PLACEHOLDER
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Production ----
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Script de entrypoint que substitui placeholders pelos valores reais
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'find /app/.next -type f -name "*.js" -exec sed -i "s|NEXT_PUBLIC_SUPABASE_URL_PLACEHOLDER|$NEXT_PUBLIC_SUPABASE_URL|g" {} +' >> /app/entrypoint.sh && \
    echo 'find /app/.next -type f -name "*.js" -exec sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY_PLACEHOLDER|$NEXT_PUBLIC_SUPABASE_ANON_KEY|g" {} +' >> /app/entrypoint.sh && \
    echo 'exec node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/bin/sh", "/app/entrypoint.sh"]
