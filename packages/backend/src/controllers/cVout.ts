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
import { EntityManager } from "typeorm";
import { mTransaction, mVin, mVout, mAddress } from '@calvario/gbc-explorer-shared';
import { Address, AddressDetails, UpdateType } from './cAddress'

BigNumber.config({ DECIMAL_PLACES: 9 })

export class Vout {
  static async create(dbTransaction: EntityManager, transactionObj: mTransaction, addressesArrayObj: mAddress[], vinObj: mVin | undefined, voutInfo: any): Promise<mVout> {
    const voutData: mVout = {
      value!: voutInfo.value,
      n: voutInfo.n,
      type: voutInfo.scriptPubKey.type,
      addresses: addressesArrayObj,
      transaction: transactionObj,
    };

    const newVout = dbTransaction.create(mVout, voutData);
    return await dbTransaction.save(newVout)
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async getVoutForVin(dbTransaction: EntityManager, vinInfo: any): Promise<mVout | undefined> {
    if (vinInfo.txid === undefined || vinInfo.vout === undefined) {
      return undefined;
    }
    return await dbTransaction.findOneOrFail(mTransaction, { txid: vinInfo.txid })
      .then(async (transactionObj: mTransaction) => {
        return await dbTransaction.findOneOrFail(mVout, {
          where: { transaction: transactionObj.id, n: vinInfo.vout },
          relations: ["addresses"]
        });
      }).then(async (vout: mVout) => {
        return vout;
      }).catch(error => {
        return Promise.reject(error);
      })
  }

  static async checkVoutAddresses(dbTransaction: EntityManager, chain: number | undefined, voutInfo: any): Promise<mAddress[]> {
    const promiseAddressesArrayObj: mAddress[] = voutInfo.scriptPubKey.addresses.map(async (addressHash: string) => {
      const address = await dbTransaction.findOne(mAddress, ({ address: addressHash }))
      if (address !== undefined) {
        if (chain === 1) {
          const addressDetails: AddressDetails = {
            type: UpdateType.ADDITION,
            inputC: 1,
            inputT: new BigNumber(voutInfo.value),
            outputC: 0,
            outputT: new BigNumber(0)
          }
          await Address.update(dbTransaction, address, addressDetails)
            .catch(error => {
              return Promise.reject(error);
            });
        }
        return address;
      } else {
        return await Address.create(dbTransaction, chain, addressHash, new BigNumber(voutInfo.value))
          .catch(error => {
            return Promise.reject(error);
          });
      }
    }, { concurrency: 1 });
    return await Promise.all(promiseAddressesArrayObj);
  }
}