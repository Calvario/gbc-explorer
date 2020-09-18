Global Blockchain Explorer
================

An open source RPC Blockchain Explorer using Typescript and TypeORM.

### Live sites


### Requires

*  Reverse Proxy for security & SSL
*  Node.js
*  Postgress (default)
*  coin daemon with RPC

### Create database

    sudo -u postgres psql
    postgres=# create database gbcexplorer;
    postgres=# create user myuser with encrypted password 'password';
    postgres=# grant all privileges on database gbcexplorer to myuser;

### Get the source

    git clone https://github.com/Calvario/gbc-explorer.git gbc-explorer

### Install node modules

    cd gbc-explorer
    npm run bootstrap
    npm run build

### Configure

Copy the ".env.example" to ".env" and edit it according your environment.

### Start Explorer with PM2

    npm install -g pm2
    pm2 start packages/frontend/dist/cluster.js --name "GBC-Explorer Frontend"
    pm2 start packages/api/dist/cluster.js --name "GBC-Explorer API"
    pm2 start packages/backend/dist/server.js --name "GBC-Explorer Backend"

### Wallet

The wallet daemon need to be running with RPC & txindex

    coind --daemon

Configuration example

    whitelist=127.0.0.1
    txindex=1
    listen=1
    server=1
    irc=1

    rpcport=33987
    rpcallowip=127.0.0.1
    rpcbind=127.0.0.1
    rpcuser=user
    rpcpassword=password