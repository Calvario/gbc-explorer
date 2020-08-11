import cluster from 'cluster';
import os from 'os';
import path from 'path';
import 'dotenv/config';
import { createConnection, getConnectionOptions } from 'typeorm';
import App from './app';
import cHome from './controllers/cHome';
import cBlock from './controllers/cBlock';
import cExtraction from './controllers/cExtraction';
import cTransaction from './controllers/cTransaction';
import cAddress from './controllers/cAddress';
import cRPC from './controllers/cRPC';
import cron from 'cron';
import Blockchain from './background/blockchain';
import debug from 'debug';

if (cluster.isMaster) {
  // Cluster
  const numWorkers = os.cpus().length;
  debug.log('Master cluster setting up ' + numWorkers + ' workers...');

  for(let i = 0; i < numWorkers; i++) {
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

  // Cronjobs
  (async () => {

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
}
else {
  (async () => {
    // Database connection
    await createConnection()
    .catch(error => {
      debug.log('Error while connecting to the database', error);
      return error;
    });

    const app = new App(
      [
        new cHome(),
        new cBlock(),
        new cExtraction(),
        new cTransaction(),
        new cAddress(),
        new cRPC(),
      ],
    );

    app.listen();
  })();
}