/**
 * Copyright (C) 2020 Steve Calvário
 *
 * This file is part of GBC Explorer, a web multi-coin blockchain explorer.
 *
 * GBC Explorer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * GBC Explorer is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * GBC Explorer. If not, see <https://www.gnu.org/licenses/>.
 */

import cluster from 'cluster';
import os from 'os';
import dotenv from 'dotenv';
import path from 'path';
import { createConnection, getConnectionOptions } from 'typeorm';
import App from './instance';
import cHome from './controllers/cHome';
import cBlock from './controllers/cBlock';
import cChain from './controllers/cChain';
import cExtraction from './controllers/cExtraction';
import cTransaction from './controllers/cTransaction';
import cAddress from './controllers/cAddress';
import cPeer from './controllers/cPeer';
import cChart from './controllers/cChart';
import cRPC from './controllers/cRPC';
import cCoinGecko from './controllers/cCoinGecko';
import debug from 'debug';

const toRoot = '../../../';

if (cluster.isMaster) {
  // Load ENV variables
  dotenv.config({ path: path.resolve(__dirname, toRoot + '.env') });

  // Cluster
  const numWorkers = os.cpus().length;
  debug.log('Master cluster setting up ' + numWorkers + ' workers...');

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('online', (worker) => {
    debug.log('Worker ' + worker.process.pid + ' is online');
  });

  cluster.on('exit', (worker, code, signal) => {
    debug.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
    debug.log('Starting a new worker');
    cluster.fork();
  });
}
else {
  (async () => {
    // Database connection
    const connectionOptions = await getConnectionOptions();
    Object.assign(connectionOptions, {
      entities: [path.resolve(__dirname, toRoot + connectionOptions.entities).toString()],
      migrations: [path.resolve(__dirname, toRoot + connectionOptions.migrations).toString()],
    });
    await createConnection(connectionOptions)
      .catch(error => {
        debug.log('Error while connecting to the database', error);
        return error;
      });

    const app = new App(
      [
        new cHome(),
        new cChain(),
        new cBlock(),
        new cExtraction(),
        new cTransaction(),
        new cAddress(),
        new cPeer(),
        new cChart(),
        new cRPC(),
        new cCoinGecko(),
      ],
    );

    app.listen();
  })();
}