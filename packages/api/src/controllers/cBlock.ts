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
import { getRepository, createQueryBuilder } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import { mBlock, mTransaction } from '@calvario/gbc-explorer-shared';
import debug from 'debug';


class Block implements iController {
  public path = '/rest/api/1/block';
  public router = Router();
  private repository = getRepository(mBlock);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, stringValidator(), this.getLatestBlocks);
    this.router.get(`${this.path}/:hash`, stringValidator(), this.getBlockByHash);
    this.router.get(`${this.path}/:hash/confirmations`, stringValidator(), this.getBlockConfirmations);
    this.router.get(`${this.path}/:hash/transactions`, stringValidator(), this.getBlockTransactions);
  }

  private getLatestBlocks = async (request: Request, response: Response) => {
    const qB = this.repository.createQueryBuilder("block")
    .innerJoinAndSelect("block.miner", "miner")
    .innerJoin("block.chain", "chain")
    .where("chain.id = 1")
    .orderBy("block.height", "DESC")
    if (request.query.afterId !== undefined) qB.andWhere("block.id < " + request.query.afterId.toString());
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getMany()
    .then(blocks => {
      return response.json(blocks);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getBlockByHash = async (request: Request, response: Response) => {
    const blockHash = request.params.hash;
    await this.repository.findOne({
      join: {
        alias: "block",
        innerJoinAndSelect: {
            miner: "block.miner",
            transactions: "block.transactions",
            chain: "block.chain",
        }
      },
      where: { hash : blockHash },
      order: { "height": "DESC" }
    })
    .then(block => {
      return response.json(block);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getBlockConfirmations = async (request: Request, response: Response) => {
    const blockHash = request.params.hash;
    await this.repository.createQueryBuilder("block")
    .select("(SELECT MAX(height) FROM block) - block.height + 1", "confirmations")
    .where("block.hash = :hash", { hash: blockHash })
    .getRawOne()
    .then(block => {
      return response.json(block);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getBlockTransactions = async (request: Request, response: Response) => {
    const blockHash = request.params.hash;
    await createQueryBuilder(mTransaction, "transaction")
    .innerJoin("transaction.blocks", "block")
    .leftJoinAndSelect("transaction.vins", "vin")
    .leftJoinAndSelect("vin.vout", "vinvout")
    .leftJoinAndSelect("vinvout.addresses", "vinaddress")
    .leftJoinAndSelect("transaction.vouts", "vout")
    .leftJoinAndSelect("vout.addresses", "address")
    .where("block.hash = :hash", { hash: blockHash })
    .orderBy("transaction.id", "ASC")
    .addOrderBy("vin.id", "ASC")
    .addOrderBy("vout.n", "ASC")
    .getMany()
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }
}

export default Block;