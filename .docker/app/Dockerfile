FROM oven/bun:1 as builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN bun build ./src/index.ts --target=node --sourcemap=inline --outfile=/app/server.js

FROM node:20 as runner
WORKDIR /app
COPY package.json .
ENV NODE_ENV=production
RUN npm install --omit=dev
RUN cp -r ./node_modules/better-sqlite3/build/Release ./Release
COPY --from=builder /app/server.js .
# USER bun
ENTRYPOINT [ "node", "server.js" ]
