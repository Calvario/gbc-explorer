Global Blockchain Explorer
================

An open source RPC Blockchain Explorer using Typescript and TypeORM.

### Preview

<img src="https://raw.githubusercontent.com/Calvario/gbc-explorer/master/docs/images/desktop.PNG" height="360">
<img src="https://raw.githubusercontent.com/Calvario/gbc-explorer/master/docs/images/mobile.PNG" height="360">

### Requires

*  Reverse Proxy for security & SSL
*  Node.js
*  Postgress (default)
*  coin deamon with RPC

### Create database

    sudo -u postgres psql
    postgres=# create database gbcexplorer;
    postgres=# create user myuser with encrypted password 'password';
    postgres=# grant all privileges on database gbcexplorer to myuser;

### Get the source

    git clone https://github.com/Calvario/gbc-explorer.git gbc-explorer

### Install node modules

    cd gbc-explorer && npm install

### Configure

Copy the ".env.example" to ".env" and edit it according your environment.
Change logo on public/images/logo.png
Change favicons on public

### Before first start

    npm run build

### Start Explorer

    npm run start

### Start Explorer with PM2

    npm install -g pm2
    pm2 start dist/server.js --name "GBC-Explorer"

### Stop Explorer

    npm stop

### Start Explorer with PM2

    pm2 stop 0

### Wallet

The wallet deamon need to be running with RPC & txindex

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