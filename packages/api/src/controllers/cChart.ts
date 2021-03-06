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

import { Router, Request, Response } from 'express';
import { getConnection } from "typeorm";
import iController from '../interfaces/iController';
import { mBlock, mVin } from '@calvario/gbc-explorer-shared';
import debug from 'debug';
import mCache from '../middlewares/mCache';


class Chart implements iController {
  public path = '/rest/api/1/chart';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/circulation`, mCache(600), this.getCirculation);
    this.router.get(`${this.path}/difficulty`, mCache(600), this.getDifficulty);
    this.router.get(`${this.path}/blockchainSize`, mCache(600), this.getBlockchainSize);
    this.router.get(`${this.path}/transactionVolume`, mCache(600), this.getTransactionVolume);
    this.router.get(`${this.path}/nethashrate`, mCache(600), this.getNethashrate);
  }

  private getCirculation = async (request: Request, response: Response) => {
    const subQuery2 = getConnection().createQueryBuilder()
      .select('DATE(to_timestamp(block.time))', 'time')
      .addSelect('SUM(vout.value)', 'amount')
      .addSelect('AVG(CASE WHEN block.height = 1 THEN 0 ELSE vout.value END)', 'generation')
      .from(mVin, 'vin')
      .innerJoin("vin.transaction", "transaction")
      .innerJoin("transaction.vouts", "vout")
      .innerJoin("transaction.blocks", "block")
      .innerJoin("block.chain", "chain")
      .where('chain.id = 1')
      .andWhere('vin.coinbase = true')
      .groupBy('DATE(to_timestamp(block.time))')
      .orderBy('1', 'ASC')

    const subQuery1 = getConnection()
      .createQueryBuilder()
      .select('"subQuery2".time', 'time')
      .addSelect('SUM(SUM("subQuery2".amount)) OVER (ORDER BY "subQuery2".time ASC)', 'amount')
      .addSelect('"subQuery2".generation', 'generation')
      .from('(' + subQuery2.getQuery() + ')', 'subQuery2')
      .groupBy('"subQuery2".time, "subQuery2".generation')

    const qB = getConnection()
      .createQueryBuilder()
      .select('"subQuery1".time', 'time')
      .addSelect('"subQuery1".amount', 'amount')
      .addSelect('"subQuery1".generation', 'generation')
      .addSelect('("subQuery1".amount - LAG("subQuery1".amount, 1) OVER (ORDER BY "subQuery1".time ASC)) /  LAG("subQuery1".amount, 1) OVER (ORDER BY "subQuery1".time ASC) * 100 * 365.25', 'inflation')
      .from('(' + subQuery1.getQuery() + ')', 'subQuery1')

    await qB.getRawMany()
      .then(avgGeneration => {
        return response.json(avgGeneration);
      })
      .catch((error) => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }

  private getDifficulty = async (request: Request, response: Response) => {
    const qB = getConnection().createQueryBuilder()
      .select('DATE(to_timestamp(block.time))', 'time')
      .addSelect('COUNT(block.height)', 'blocks')
      .addSelect('AVG(block.difficulty)', 'difficulty')
      .addSelect('SUM(block.nTx)', 'transactions')
      .from(mBlock, 'block')
      .innerJoin("block.chain", "chain")
      .where('chain.id = 1')
      .groupBy('DATE(to_timestamp(block.time))')
      .orderBy('1', 'ASC')

    await qB.getRawMany()
      .then(difficulty => {
        return response.json(difficulty);
      })
      .catch((error) => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }

  private getBlockchainSize = async (request: Request, response: Response) => {
    const subQuery = getConnection().createQueryBuilder()
      .select('DATE(to_timestamp(block.time))', 'time')
      .addSelect('SUM(block.size)', 'size')
      .addSelect('AVG(block.size)', 'avgblocksize')
      .addSelect('AVG(block.nTx)', 'avgtransactions')
      .from(mBlock, 'block')
      .innerJoin("block.chain", "chain")
      .where('chain.id = 1')
      .groupBy('DATE(to_timestamp(block.time))')
      .orderBy('1', 'ASC')

    const qB = getConnection()
      .createQueryBuilder()
      .select('"dailyChain".time', 'time')
      .addSelect('SUM(SUM("dailyChain".size)) OVER (ORDER BY "dailyChain".time ASC) / 1048576', 'size')
      .addSelect('"dailyChain".avgblocksize / 1048576', 'avgblocksize')
      .addSelect('"dailyChain".avgtransactions', 'avgtransactions')
      .from('(' + subQuery.getQuery() + ')', 'dailyChain')
      .groupBy('"dailyChain".time, "dailyChain".avgblocksize, "dailyChain".avgtransactions')

    await qB.getRawMany()
      .then(avgBlockSize => {
        return response.json(avgBlockSize);
      })
      .catch((error) => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }

  private getTransactionVolume = async (request: Request, response: Response) => {
    const qB = getConnection().createQueryBuilder()
      .select('DATE(to_timestamp(block.time))', 'time')
      .addSelect('SUM(block.outputT)', 'volume')
      .addSelect('AVG(block.outputT)', 'avgAmount')
      .addSelect('AVG(CASE WHEN transaction.fee = 0 THEN null ELSE transaction.fee END)', 'avgFee')
      .from(mBlock, 'block')
      .innerJoin("block.chain", "chain")
      .innerJoin('block.transactions', 'transaction')
      .where('chain.id = 1')
      .andWhere('block.height > 500')
      .groupBy('DATE(to_timestamp(block.time))')
      .orderBy('1', 'ASC')

    await qB.getRawMany()
      .then(avgTransactionsPerBlock => {
        return response.json(avgTransactionsPerBlock);
      })
      .catch((error) => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }

  private getNethashrate = async (request: Request, response: Response) => {
    // CTE are not possible natively on TypeORM
    // TODO Clean version when possible
    const qB = getConnection().query(`
      with recursive CTE as
      (
        select
          b1.height,
          b1.time,
          DATE(to_timestamp(b1.time)) as htime,
          GREATEST(
          ((
            (72 - 1) *
            30 +
            b1.time - 1472669240 +
            b1.time - 1472669240
          ) / (72 + 1)),
          30
        ) as nTargetSpacingWork,
          b1.difficulty *
        1024 *
        4294.967296 /
        GREATEST(
          ((
            (72 - 1) *
            30 +
            b1.time - 1472669240 +
            b1.time - 1472669240
          ) / (72 + 1)),
          30
        ) *
        60 as hashrate
        FROM block as b1
        where b1.height = 1
          and b1."chainId" = 1
        union all
        select
          b2.height,
          b2.time,
          DATE(to_timestamp(b2.time)) as htime,
          GREATEST(
          ((
            (72 - 1) *
            c.nTargetSpacingWork +
            b2.time - c.time +
            b2.time - c.time
          ) / (72 + 1)),
          30
        ) as nTargetSpacingWork,
          b2.difficulty *
        1024 *
        4294.967296 /
        GREATEST(
          ((
            (72 - 1) *
            c.nTargetSpacingWork +
            b2.time - c.time +
            b2.time - c.time
          ) / (72 + 1)),
          30
        ) *
        60 as hashrate
        from CTE as C
        inner join block as b2
            on b2.height = C.height + 1
        where b2."chainId" = 1
      )
      SELECT htime, MIN(hashrate), AVG(hashrate), MAX(hashrate) FROM cte group by htime order by htime asc; `
    );

    await qB
      .then(avgBlockSize => {
        return response.json(avgBlockSize);
      })
      .catch((error) => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }
}

export default Chart;