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

import BigNumber from "bignumber.js"
import { EntityManager, UpdateResult } from "typeorm";
import { mBlock, mTransaction } from '@calvario/gbc-explorer-shared';

BigNumber.config({ DECIMAL_PLACES: 9 })

export class Transaction {
  static async select(dbTransaction: EntityManager, blockHash: string): Promise<mTransaction[]> {
    return dbTransaction.createQueryBuilder(mTransaction, "transaction")
      .innerJoin("transaction.blocks", "block")
      .innerJoin("block.chain", "chain")
      .innerJoinAndSelect("transaction.vins", "vin")
      .leftJoinAndSelect("vin.vout", "vinvout")
      .leftJoinAndSelect("vinvout.addresses", "vinaddress")
      .innerJoinAndSelect("transaction.vouts", "vout")
      .innerJoinAndSelect("vout.addresses", "address")
      .where("block.hash = :hash", { hash: blockHash })
      .orderBy("transaction.id", "ASC")
      .addOrderBy("vin.id", "ASC")
      .addOrderBy("vout.n", "ASC")
      .getMany()
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }
  static async create(dbTransaction: EntityManager, blockObj: mBlock, transactionInfo: any): Promise<mTransaction> {
    const transactionData: mTransaction = {
      txid: transactionInfo.txid,
      version: transactionInfo.version,
      time: transactionInfo.time,
      locktime: transactionInfo.locktime,
      blocks: [blockObj],

      // PoW
      hash: transactionInfo.hash,
      size: transactionInfo.size,
      vsize: transactionInfo.vsize,
      weight: transactionInfo.weight,
    };

    const newTransaction = dbTransaction.create(mTransaction, transactionData);
    return await dbTransaction.save(newTransaction)
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async update(dbTransaction: EntityManager, transactionObj: mTransaction, updatedTransaction: UpdatedTransaction): Promise<UpdateResult> {
    return await dbTransaction.update(mTransaction, transactionObj.id!, {
      inputC: updatedTransaction.tInputC,
      inputT: updatedTransaction.tInputT.toNumber(),
      outputC: updatedTransaction.tOutputC,
      outputT: updatedTransaction.tOutputT.toNumber(),
      fee: updatedTransaction.tFee.toNumber(),
    })
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async updateLinkedBlock(dbTransaction: EntityManager, transactionObj: mTransaction, blockObj: mBlock): Promise<void> {
    return await dbTransaction.createQueryBuilder()
      .relation(mTransaction, "blocks")
      .of(transactionObj)
      .add(blockObj)
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }
}

export interface UpdatedTransaction {
  tInputC: number,
  tInputT: BigNumber,
  tOutputC: number,
  tOutputT: BigNumber,
  tFee: BigNumber
}