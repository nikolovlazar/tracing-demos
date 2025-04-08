FROM node:20-slim AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm install

FROM node:20-slim AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm install --omit=dev

FROM node:20-slim AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
# Pass the API URL as a build argument
ARG API_URL
ENV API_URL=$API_URL
RUN npm run build

FROM node:20-slim
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
# Pass the API URL as an environment variable
ENV API_URL=http://kong:8000
WORKDIR /app
CMD ["npm", "run", "start"]