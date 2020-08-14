import path from 'path';
import { createConnection, getConnectionOptions } from 'typeorm';
import cron from 'cron';
import Blockchain from './blockchain';
import dotenv from 'dotenv';
import debug from 'debug';

// Cronjobs
(async () => {
  // Load ENV variables
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

  // Database connection
  const connectionOptions = await getConnectionOptions();
  if (process.env.NODE_ENV === 'development')
    Object.assign(connectionOptions, { synchronize: true });

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

  // Sync labels
  const jobLabels = new CronJob('45 * * * * *', async () => {
    if(!isRunning) {
      isRunning = true;
      await blockchain.updateLabelForAddresses(path.join(__dirname, '../'));
      isRunning = false;
    }
  });

  jobSync.start();
  jobLabels.start();
})();