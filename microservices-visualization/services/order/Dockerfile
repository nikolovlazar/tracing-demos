FROM oven/bun:1.2.8

WORKDIR /app

COPY package.json .
RUN bun install

COPY . .

EXPOSE 8080

CMD ["bun", "run", "dev"]