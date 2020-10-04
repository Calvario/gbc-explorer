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
import path from 'path'
import App from './instance';
import cHome from './controllers/cHome';
import cBlock from './controllers/cBlock';
import cExtraction from './controllers/cExtraction';
import cTransaction from './controllers/cTransaction';
import cAddress from './controllers/cAddress';
import debug from 'debug';

if (cluster.isMaster) {
  // Load ENV variables
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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
  const app = new App(
    [
      new cHome(),
      new cBlock(),
      new cExtraction(),
      new cTransaction(),
      new cAddress(),
    ],
  );

  app.listen();
}