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

import bodyParser from 'body-parser';
import express from 'express';
import path from 'path';
import logger from 'morgan';
import iController from './interfaces/iController';
import debug from 'debug';

class App {
  public app: express.Application;

  constructor(controllers: iController[]) {
    this.app = express();

    this.initializeMiddlewares();
    this.initializeControllers(controllers);
  }

  public listen() {
    this.app.listen(process.env.APP_FE_PORT, () => {
      debug.log(`App listening on the port ${process.env.APP_FE_PORT}`);
    });
  }

  private initializeMiddlewares() {
    this.app.set('views', path.join(__dirname, '../views'));
    this.app.set('view engine', 'pug');
    this.app.use('/assets', express.static(path.join(__dirname, '../public')));
    this.app.use('/assets/js', express.static(path.join(__dirname, './js')));
    this.app.use('/assets/vendor/css/bulma', express.static(path.join(__dirname, '../../../node_modules/bulma/css/')));
    this.app.use('/assets/vendor/js/jquery', express.static(path.join(__dirname, '../../../node_modules/jquery/dist/')));
    this.app.use('/assets/vendor/js/moment/moment.js', express.static(path.join(__dirname, '../../../node_modules/moment/moment.js')));
    this.app.use('/assets/vendor/js/chart.js', express.static(path.join(__dirname, '../../../node_modules/chart.js/dist/')));
    this.app.use('/assets/vendor/js/chartjs-plugin-zoom', express.static(path.join(__dirname, '../../../node_modules/chartjs-plugin-zoom/dist/')));
    this.app.use('/assets/vendor/js/hammerjs/hammer.min.js', express.static(path.join(__dirname, '../../../node_modules/hammerjs/hammer.min.js')));
    this.app.use('/assets/vendor/js/hammerjs/hammer.min.js.map', express.static(path.join(__dirname, '../../../node_modules/hammerjs/hammer.min.js.map')));
    this.app.use('/assets/vendor/fontawesome-free', express.static(path.join(__dirname, '../../../node_modules/@fortawesome/fontawesome-free/')));
    this.app.use('/assets/vendor/bootstrap-table', express.static(path.join(__dirname, '../../../node_modules/bootstrap-table/dist/')));
    this.app.set('trust proxy', true);
    this.app.use(logger(':remote-addr - [:date[clf]] :status ":method :url" :res[content-length] ":referrer" :response-time ms - :res[content-length]'));
    this.app.use(bodyParser.json());
  }

  private initializeControllers(controllers: iController[]) {
    controllers.forEach((controller) => {
      this.app.use('/', controller.router);
    });
  }
}

export default App;