import 'dotenv/config';
import { createConnection } from 'typeorm';
import App from './app';
import cHome from './controllers/cHome';
import cBlock from './controllers/cBlock';
import cTransaction from './controllers/cTransaction';
import cAddress from './controllers/cAddress';
import cRPC from './controllers/cRPC';
import debug from 'debug';

(async () => {
  // Database connection
  try {
    await createConnection();
  } catch (error) {
    debug.log('Error while connecting to the database', error);
    return error;
  }

  const app = new App(
    [
      new cHome(),
      new cBlock(),
      new cTransaction(),
      new cAddress(),
      new cRPC(),
    ],
  );

  app.listen();
})();