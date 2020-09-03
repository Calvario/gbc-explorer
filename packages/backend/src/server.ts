import path from 'path';
import { createConnection, getConnectionOptions } from 'typeorm';
import cron from 'cron';
import Blockchain from './blockchain';
import dotenv from 'dotenv';
import debug from 'debug';

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

  let isRunning = false;
  const CronJob = cron.CronJob;
  const blockchain = new Blockchain();

  // Sync blockchain
  const jobSync = new CronJob('10 * * * * *', async () => {
    if(!isRunning) {
      isRunning = true;
      await blockchain.sync()
      isRunning = false;
    }
  });

  // Check chain tips
  const jobChainTips = new CronJob('15 * * * * *', async () => {
    if(!isRunning) {
      isRunning = true;
      await blockchain.checkChainTips()
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

  jobSync.start();
  jobChainTips.start();
  jobLabels.start();
})();