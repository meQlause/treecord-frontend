# The web app is a static Vite build served by nginx on Cloud Run ($PORT). VITE_* values are public (ADR-014) and
# baked in at build time, so each one is a build argument.
FROM node:24-alpine AS build
WORKDIR /app
# the pnpm version the repository is developed with, so the lockfile resolves the same way it does locally
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
ARG VITE_API_URL
ARG VITE_PRIVY_APP_ID
ARG VITE_CHAIN_ID
ARG VITE_NETWORK_LABEL
ARG VITE_RPC_URL
ARG VITE_CAMPAIGN_FACTORY_ADDRESS
ARG VITE_TIME_UNIT_SECONDS
RUN pnpm run build

FROM nginx:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=8080
EXPOSE 8080
