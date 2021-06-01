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

import path from 'path';
import debug from 'debug';
import dotenv from 'dotenv';
import cron from 'cron';
import { RPCClient } from 'rpc-bitcoin';
import { createConnection, getConnectionOptions } from 'typeorm';
import { Block } from './controllers/cBlock';
import { Chain } from './controllers/cChain';
import { Peer } from './controllers/cPeer';
import { Address } from './controllers/cAddress'

const toRoot = '../../../';

// Cronjobs
(async () => {
  // Load ENV variables
  dotenv.config({ path: path.resolve(__dirname, toRoot + '.env') });

  // Database connection
  const connectionOptions = await getConnectionOptions()
    .catch(error => {
      debug.log('getConnectionOptions');
      debug.log(error);
      return Promise.reject(error);
    });

  Object.assign(connectionOptions, {
    entities: [path.resolve(__dirname, toRoot + connectionOptions.entities).toString()],
    migrations: [path.resolve(__dirname, toRoot + connectionOptions.migrations).toString()],
  });

  if (process.env.NODE_ENV === 'development') {
    debug.log("Synchronize");
    Object.assign(connectionOptions, { synchronize: true });
  }
  else {
    debug.log("Migrations");
    Object.assign(connectionOptions, { migrationsRun: true });
  }

  await createConnection(connectionOptions)
    .catch(error => {
      debug.log('Error while connecting to the database');
      debug.log(error);
      return Promise.reject(error);
    });

  // RPC Connection
  const url = process.env.RPC_HOST;
  const user = process.env.RPC_USERNAME;
  const pass = String(process.env.RPC_PASSWORD);
  const port = Number(process.env.RPC_PORT);
  const timeout = Number(process.env.RPC_TIMEOUT);
  const rpcClient = new RPCClient({ url, port, timeout, user, pass });

  // Cron
  let isRunning = false;
  const CronJob = cron.CronJob;

  // Sync Peers
  const jobGetPeers = new CronJob('30 * * * * *', async () => {
    await Peer.sync(rpcClient)
      .catch(error => {
        debug.log(error);
        return Promise.reject(error);
      });
  });

  // Sync blockchain
  const jobSync = new CronJob('10 * * * * *', async () => {
    if (!isRunning) {
      isRunning = true;
      await Block.sync(rpcClient)
        .catch(error => {
          debug.log(error);
          return Promise.reject(error);
        })
        .finally(() => {
          isRunning = false;
        });
    }
  });

    // Check chain tips
    const jobChainTips = new CronJob('40 * * * * *', async () => {
      if (!isRunning) {
        isRunning = true;
        await Chain.sync(rpcClient)
          .catch(error => {
            debug.log(error);
            return Promise.reject(error);
          })
          .finally(() => {
            isRunning = false;
          });
      }
    });

  // Sync labels
  const jobLabels = new CronJob('45 * * * * *', async () => {
    if (!isRunning) {
      isRunning = true;
      await Address.updateLabels(path.join(__dirname, toRoot))
        .catch(error => {
          debug.log(error);
          return Promise.reject(error);
        })
        .finally(() => {
          isRunning = false;
        });
    }
  });

  jobGetPeers.start();
  jobSync.start();
  jobChainTips.start();
  jobLabels.start();
})();