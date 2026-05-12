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

# Dar permissão para o entrypoint modificar os arquivos
RUN chown -R nextjs:nodejs /app/.next

# Script de entrypoint
COPY --chmod=755 <<'EOF' /app/entrypoint.sh
#!/bin/sh
set -e
# Substituir placeholders pelos valores reais das env vars
find /app/.next -type f \( -name "*.js" -o -name "*.json" \) | xargs sed -i "s|NEXT_PUBLIC_SUPABASE_URL_PLACEHOLDER|${NEXT_PUBLIC_SUPABASE_URL}|g" 2>/dev/null || true
find /app/.next -type f \( -name "*.js" -o -name "*.json" \) | xargs sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY_PLACEHOLDER|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" 2>/dev/null || true
exec node server.js
EOF

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/entrypoint.sh"]
