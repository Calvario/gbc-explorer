# Base on offical Node.js Alpine image
FROM node:alpine

# Create app directory
ENV APP_PATH /gbc-explorer
WORKDIR $APP_PATH

# Copy main required files
COPY ./package*.json ./tsconfig*.json ./lerna.json ./.env ./
# Copy dependecy
COPY ./packages/shared/package*.json ./packages/shared/tsconfig*.json  ./packages/shared/
COPY ./packages/shared/src  ./packages/shared/src
# Copy package required files
COPY ./packages/api/package*.json ./packages/api/tsconfig*.json ./packages/api/

# Install required packages
RUN npm install
RUN npm run bootstrap

# Build source
COPY ./packages/api ./packages/api
RUN npm run build

EXPOSE 3001
CMD [ "npm", "--prefix", "packages/api", "run", "start" ]