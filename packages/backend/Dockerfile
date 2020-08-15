# Base on offical Node.js Alpine image
FROM node:alpine

# Create app directory
ENV APP_PATH /gbc-explorer
WORKDIR $APP_PATH

# Copy required files
COPY ./package*.json ./
COPY ./tsconfig*.json ./
COPY ./tslint.json ./
COPY ./lerna.json ./
COPY ./.env ./

# install lerna local
RUN npm install

# Bundle app source
COPY ./packages/shared ./packages/shared
COPY ./packages/backend ./packages/backend

# "lerna boostrap" will install all packages
RUN npm run bootstrap
RUN npm run build

CMD [ "npm", "--prefix", "packages/backend", "run", "start" ]