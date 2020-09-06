import path from 'path';
import debug from 'debug';
import dotenv from 'dotenv';
import { RPCClient } from 'rpc-bitcoin';
import { createConnection, getConnectionOptions } from 'typeorm';
import cron from 'cron';
import Blockchain from './blockchain';
import Peer from './peer';

const toRoot = '../../../';

// Cronjobs
(async () => {
  // Load ENV variables
  dotenv.config({ path: path.resolve(__dirname, toRoot + '.env') });

  // Database connection
  const connectionOptions = await getConnectionOptions();
  Object.assign(connectionOptions, {
    entities: [ path.resolve(__dirname, toRoot + connectionOptions.entities ).toString() ],
    migrations: [ path.resolve(__dirname, toRoot + connectionOptions.migrations).toString() ],
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
    debug.log('Error while connecting to the database', error);
    return error;
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
  const blockchain = new Blockchain();

  // Sync Peers
  const jobGetPeers = new CronJob('30 * * * * *', async () => {
    await Peer(rpcClient);
  });

  // Sync blockchain
  const jobSync = new CronJob('10 * * * * *', async () => {
    if(!isRunning) {
      isRunning = true;
      await blockchain.sync(rpcClient);
      isRunning = false;
    }
  });

  // Check chain tips
  const jobChainTips = new CronJob('40 * * * * *', async () => {
    if(!isRunning) {
      isRunning = true;
      await blockchain.checkChainTips(rpcClient);
      isRunning = false;
    }
  });

  // Sync labels
  const jobLabels = new CronJob('45 * * * * *', async () => {
    if(!isRunning) {
      isRunning = true;
      await blockchain.updateLabelForAddresses(path.join(__dirname, toRoot));
      isRunning = false;
    }
  });

  jobGetPeers.start();
  jobSync.start();
  jobChainTips.start();
  jobLabels.start();
})();