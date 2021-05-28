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

import debug from 'debug';
import BigNumber from "bignumber.js"
import fs from 'fs';
import { EntityManager, getRepository, UpdateResult } from "typeorm";
import { mAddress, mBlock, mTransaction } from '@calvario/gbc-explorer-shared';
import { Transaction } from "./cTransaction";

BigNumber.config({ DECIMAL_PLACES: 9 })

export class Address {
  static async create(dbTransaction: EntityManager, chain: number | undefined, addressHash: string, inputBalance: BigNumber): Promise<mAddress> {
    const addressData: mAddress = {
      address: addressHash,
      nTx: chain === 1 ? 1 : 0,
      balance: chain === 1 ? inputBalance.toNumber() : 0,
      inputC: chain === 1 ? 1 : 0,
      outputC: 0,
    };

    const newAddress = dbTransaction.create(mAddress, addressData);
    return dbTransaction.save(newAddress)
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async update(dbTransaction: EntityManager, addressObj: mAddress, addressDetails: AddressDetails): Promise<UpdateResult> {
    return dbTransaction.update(mAddress, addressObj.id!, {
      nTx: addressDetails.type === UpdateType.ADDITION ?
        addressObj.nTx = addressObj.nTx + 1:
        addressObj.nTx = addressObj.nTx - 1,
      inputC: addressDetails.type === UpdateType.ADDITION ?
        addressObj.inputC = addressObj.inputC + addressDetails.inputC:
        addressObj.inputC = addressObj.inputC - addressDetails.inputC,
      outputC: addressDetails.type === UpdateType.ADDITION ?
        addressObj.outputC = addressObj.outputC + addressDetails.outputC:
        addressObj.outputC = addressObj.outputC - addressDetails.outputC,
      balance: addressDetails.type === UpdateType.ADDITION ?
        (addressDetails.inputC === 1 ?
          new BigNumber(addressObj.balance).plus(addressDetails.inputT).toNumber() :
          new BigNumber(addressObj.balance).minus(addressDetails.outputT).toNumber()
        ) :
        (addressDetails.inputC === 1 ?
          new BigNumber(addressObj.balance).minus(addressDetails.inputT).toNumber() :
          new BigNumber(addressObj.balance).plus(addressDetails.outputT).toNumber()
        )
    })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static async updateLabels(path: string) {
    const addressRepository = getRepository(mAddress);
    const file = 'labels.json'

    try {
      const fileExist = fs.existsSync(path + file);
      if (!fileExist) return undefined;

      const rawdata = fs.readFileSync(path + file, 'utf8');
      const addressesLabel: [{ address: string, label: string }] = JSON.parse(rawdata);

      if (addressesLabel) {
        for (const addressJSON of addressesLabel) {
          await addressRepository.findOne(({ address: addressJSON.address }))
            .then(async (address: mAddress | undefined) => {
              if (address) {
                address.label = addressJSON.label;
                await addressRepository.update(address.id!, address)
                debug.log(address.address + ' updated with label: ' + addressJSON.label)
              } else {
                debug.log(addressJSON.address + ' not found.')
              }
            })
        }
        fs.unlink(path + file, (error) => {
          if (error) return Promise.reject(error);
        });
      }
    } catch (error) {
      debug.log('Incorrect file format for ' + file);
      fs.unlink(path + file, (unlinkError) => {
        if (unlinkError) return Promise.reject(unlinkError);
      });
    }
  }

  static async updateForBlock(dbTransaction: EntityManager, dbBlock: mBlock, mainChain: boolean) {
    // Update the addresses information
    await Transaction.select(dbTransaction, dbBlock.hash)
      .then(async (transactions: mTransaction[]) => {
        // Loop for each transaction
        for (const transaction of transactions) {
          if (transaction.vins !== undefined) {
            // Loop for each VIN
            for (const vin of transaction.vins) {
              if (vin.coinbase === false && vin.vout !== undefined) {
                const addressDetails: AddressDetails = {
                  type: mainChain === true ? UpdateType.ADDITION : UpdateType.SUBTRACTION,
                  inputC: 0,
                  inputT: new BigNumber(0),
                  outputC: 1,
                  outputT: new BigNumber(vin.vout.value)
                }
                await this.update(dbTransaction, vin.vout.addresses![0], addressDetails)
                  .catch(error => {
                    return Promise.reject(error);
                  });
              }
            }
          }

          if (transaction.vouts !== undefined) {
            // Loop for each VOUT
            for (const vout of transaction.vouts) {
              const addressDetails: AddressDetails = {
                type: mainChain === true ? UpdateType.ADDITION : UpdateType.SUBTRACTION,
                inputC: 1,
                inputT: new BigNumber(vout.value),
                outputC: 0,
                outputT: new BigNumber(0),
              }
              if (vout.addresses !== undefined) {
                await this.update(dbTransaction, vout.addresses[0], addressDetails)
                  .catch(error => {
                    return Promise.reject(error);
                  });
              }
            }
          }
        }
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
}

export enum UpdateType {
  ADDITION = 1,
  SUBTRACTION = 2,
}

export interface AddressDetails {
  type: UpdateType,
  inputC: number,
  inputT: BigNumber,
  outputC: number,
  outputT: BigNumber
}