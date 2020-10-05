Global Blockchain Explorer
================

An open source RPC Blockchain Explorer using Typescript and TypeORM.

[![DeepScan grade](https://deepscan.io/api/teams/10460/projects/13319/branches/220035/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=10460&pid=13319&bid=220035)

### Live sites


### Requires

*  Reverse Proxy for security & SSL
*  Node.js
*  Postgress (default)
*  Redis
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

## Copying

This program is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU General Public License for more details.

See LICENSE.txt for a copy of the GNU General Public License, or visit
<https://www.gnu.org/licenses/>.