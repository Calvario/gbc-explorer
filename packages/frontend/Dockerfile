# Base on offical Node.js Alpine image
FROM node:alpine

# Define app directory
ENV APP_PATH /gbc-explorer
WORKDIR $APP_PATH

# Copy main required files
COPY ./package*.json ./tsconfig*.json ./lerna.json ./.env ./
# Copy dependecy
COPY ./packages/shared/package*.json ./packages/shared/tsconfig*.json  ./packages/shared/
COPY ./packages/shared/src  ./packages/shared/src
# Copy package required files
COPY ./packages/frontend/package*.json ./packages/frontend/tsconfig*.json ./packages/frontend/

# Install required packages
RUN npm install
RUN npm run bootstrap

# Build source
COPY ./packages/frontend/src ./packages/frontend/src
RUN npm run build

# Copy static files
COPY ./packages/frontend/public ./packages/frontend/public
COPY ./packages/frontend/views ./packages/frontend/views
COPY ./packages/frontend/swagger.json ./packages/frontend

EXPOSE 3000
CMD [ "npm", "--prefix", "packages/frontend", "run", "start" ]