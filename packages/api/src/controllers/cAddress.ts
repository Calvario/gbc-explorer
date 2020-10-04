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
import { mTransaction, mAddress, mVin, mVout } from '@calvario/gbc-explorer-shared';

import debug from 'debug';

class Address implements iController {
  public path = '/rest/api/1/address';
  public router = Router();
  private repository = getRepository(mAddress);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, stringValidator(), this.getRichAddresses);
    this.router.get(`${this.path}/:hash`, stringValidator(), this.getAddressByHash);
    this.router.get(`${this.path}/:hash/transactions`, stringValidator(), this.getTransactionsForAddress);
  }

  private getRichAddresses = async (request: Request, response: Response)  => {
    const qB = this.repository.createQueryBuilder("address")
    .select("ROW_NUMBER() OVER (ORDER BY address.balance DESC)", "rank")
    .addSelect("address.address", "address")
    .addSelect("address.label", "label")
    .addSelect("address.balance", "balance")
    .addSelect("address.nTx", "nTx")
    .addSelect("address.inputC", "inputC")
    .addSelect("address.outputC", "outputC")
    .orderBy("address.balance", "DESC")
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getRawMany()
    .then(addresses => {
      return response.json(addresses);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getAddressByHash = async (request: Request, response: Response) => {
    const addressHash = request.params.hash;
    await this.repository.findOneOrFail({ address: addressHash })
    .then(address => {
      return response.json(address);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(404)
    });
  }

  private getTransactionsForAddress = async (request: Request, response: Response) => {
    const addressHash = request.params.hash;
    const qB = createQueryBuilder(mTransaction, "transaction");
    qB.select("transaction.txid", "transaction_txid")
    .addSelect("block.hash", "block_hash")
    .addSelect("block.height", "block_height")
    .addSelect("block.time", "block_time")
    .addSelect("vout.n", "vout_n")
    .addSelect("vout.value", "vout_value")
    .addSelect("vinvout.value", "vinvout_value")
    .innerJoin("transaction.blocks", "block")
    .innerJoin("block.chain", "chain")
    .leftJoin("transaction.vins", "vin", "vin.transaction = transaction.id AND vin.id IN " + qB.subQuery()
      .select("vin.id")
      .from(mVin, "vin")
      .innerJoin("vin.vout", "vout")
      .innerJoin("vout.addresses", "address")
      .where("address.address = :address", { address: addressHash })
      .getQuery()
    )
    .leftJoin("vin.vout", "vinvout")
    .leftJoin("transaction.vouts", "vout", "vout.transaction = transaction.id AND vout.id IN " + qB.subQuery()
      .select("vout.id")
      .from(mVout, "vout")
      .innerJoin("vout.addresses", "address")
      .where("address.address = :address", { address: addressHash })
      .getQuery()
    )
    .where("(vin.id IS NOT NULL OR vout.id IS NOT NULL)")
    .andWhere("chain.id = 1")
    .orderBy("transaction.id", "DESC")
    .addOrderBy("vin.id", "ASC")
    if (request.query.afterId !== undefined) qB.andWhere("transaction.id < " + request.query.afterId.toString());
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getRawMany()
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(404)
    });
  }
}

export default Address;