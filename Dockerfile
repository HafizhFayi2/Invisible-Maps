# ---- Base stage ----
FROM node:20-slim AS base
WORKDIR /app


# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Build ----
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci

# Receive build-time secrets as Docker build args
ARG VITE_GEMINI_API_KEY
ARG VITE_GEMINI_BACKUP_KEYS
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL

COPY . .

# Write .env so Vite bakes these values into the JS bundle
RUN echo "VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}" > .env && \
    echo "VITE_GEMINI_BACKUP_KEYS=${VITE_GEMINI_BACKUP_KEYS}" >> .env && \
    echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" >> .env && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env && \
    echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" >> .env

RUN npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install tsx globally to run TypeScript server
RUN npm install -g tsx

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY package.json ./

EXPOSE 8080

# Run the API server using tsx (Cloud Run listens on $PORT)
CMD ["tsx", "server/index.ts"]
