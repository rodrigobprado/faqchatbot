FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/widget/package.json apps/widget/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @faqchatbot/widget build

FROM nginx:1.27-alpine AS runner
COPY apps/widget/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/widget/dist /usr/share/nginx/html
EXPOSE 80

