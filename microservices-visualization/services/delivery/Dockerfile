FROM oven/bun:1.2.8

WORKDIR /app

COPY package.json .
RUN bun install

COPY . .

EXPOSE 8083

CMD ["bun", "run", "dev"]