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