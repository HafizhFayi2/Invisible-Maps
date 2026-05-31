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
COPY . .
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
