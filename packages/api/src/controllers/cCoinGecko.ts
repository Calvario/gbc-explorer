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

import { Request, Response, Router } from 'express';
import iController from '../interfaces/iController';
import mCache from '../middlewares/mCache';
import axios from 'axios';
import debug from 'debug';

class CoinGecko implements iController {
  public path = '/rest/api/1/coingecko';
  public router = Router();
  private symbol = process.env.COINGECKO_SYMBOL!;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/price`, mCache(60), this.getPrice);
    this.router.get(`${this.path}/tickers`, mCache(60), this.getTickers);
    this.router.get(`${this.path}/news`, mCache(60), this.getNews);
  }

  private getPrice = async (request: Request, response: Response) => {
    const link = 'https://api.coingecko.com/api/v3/simple/price?ids=' + this.symbol
      + '&vs_currencies=usd%2Cbtc&include_market_cap=true&include_24hr_vol=true';
    return await axios.get(link)
      .then(apiResponse => {
        return response.json(apiResponse.data);
      })
      .catch(error => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }

  private getTickers = async (request: Request, response: Response) => {
    const link = 'https://api.coingecko.com/api/v3/coins/' + this.symbol +
      '/tickers?id=' + this.symbol;
    return await axios.get(link)
      .then(apiResponse => {
        return response.json(apiResponse.data);
      })
      .catch(error => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }

  private getNews = async (request: Request, response: Response) => {
    const link = 'https://api.coingecko.com/api/v3/coins/' + this.symbol +
      '/status_updates';
    return await axios.get(link)
      .then(apiResponse => {
        return response.json(apiResponse.data);
      })
      .catch(error => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }
}

export default CoinGecko;