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
import { getRepository } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import { mTransaction } from '@calvario/gbc-explorer-shared';
import debug from 'debug';

class Transaction implements iController {
  public path = '/rest/api/1/transaction';
  public router = Router();
  private repository = getRepository(mTransaction);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, stringValidator(), this.getLatestTransactions);
    this.router.get(`${this.path}/:txid`, stringValidator(), this.getTransactionByTxId);
  }

  private getLatestTransactions = async (request: Request, response: Response) => {
    const qB = this.repository.createQueryBuilder("transaction")
    .innerJoinAndSelect("transaction.blocks", "block")
    .innerJoinAndSelect("block.chain", "chain")
    .where("chain.id = 1")
    .orderBy("block.height", "DESC")
    if (request.query.afterId !== undefined) qB.andWhere("transaction.id < " + request.query.afterId.toString());
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getMany()
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getTransactionByTxId = async (request: Request, response: Response) => {
    const txIdParam = request.params.txid;
    await this.repository.createQueryBuilder("transaction")
    .leftJoinAndSelect("transaction.blocks", "block")
    .leftJoinAndSelect("block.chain", "chain")
    .leftJoinAndSelect("chain.status", "chainStatus")
    .leftJoinAndSelect("transaction.vins", "vin")
    .leftJoinAndSelect("vin.vout", "vinvout")
    .leftJoinAndSelect("vinvout.transaction", "vintransaction")
    .leftJoinAndSelect("vinvout.addresses", "vinaddress")
    .leftJoinAndSelect("transaction.vouts", "vout")
    .leftJoinAndSelect("vout.addresses", "address")
    .leftJoinAndSelect("vout.vins", "voutvin")
    .leftJoinAndSelect("voutvin.transaction", "voutvintransaction")
    .leftJoinAndSelect("voutvintransaction.blocks", "voutvinblock")
    .leftJoinAndSelect("voutvinblock.chain", "voutvinchain")
    .where("transaction.txid = :txid", { txid: txIdParam })
    .orderBy("vin.id", "ASC")
    .addOrderBy("vout.n", "ASC")
    .addOrderBy("voutvinchain.id", "ASC")
    .getOne()
    .then( transaction => {
      return response.json(transaction);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(404)
    });
  }
}

export default Transaction;