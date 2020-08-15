import cluster from 'cluster';
import os from 'os';
import dotenv from 'dotenv';
import path from 'path';
import { createConnection, getConnectionOptions } from 'typeorm';
import App from './instance';
import cHome from './controllers/cHome';
import cBlock from './controllers/cBlock';
import cExtraction from './controllers/cExtraction';
import cTransaction from './controllers/cTransaction';
import cAddress from './controllers/cAddress';
import cRPC from './controllers/cRPC';
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
      entities: [ path.resolve(__dirname, toRoot + connectionOptions.entities ).toString() ],
      migrations: [ path.resolve(__dirname, toRoot + connectionOptions.migrations).toString() ],
    });
    await createConnection(connectionOptions)
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