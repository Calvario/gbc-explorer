import debug from 'debug';
import BigNumber from "bignumber.js"
import fs from 'fs';
import { EntityManager, getRepository, UpdateResult } from "typeorm";
import { mAddress } from '@calvario/gbc-explorer-shared';

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
    return await dbTransaction.save(newAddress)
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async update(dbTransaction: EntityManager, addressObj: mAddress, addressDetails: AddressDetails): Promise<UpdateResult> {
    return await dbTransaction.update(mAddress, addressObj.id!, {
      nTx: addressDetails.type === UpdateType.ADDITION ?
        addressObj.nTx += 1 :
        addressObj.nTx -= 1,
      inputC: addressDetails.type === UpdateType.ADDITION ?
        addressObj.inputC += addressDetails.inputC :
        addressObj.inputC -= addressDetails.inputC,
      outputC: addressDetails.type === UpdateType.ADDITION ?
        addressObj.outputC += addressDetails.outputC :
        addressObj.outputC -= addressDetails.outputC,
      balance: addressDetails.type === UpdateType.ADDITION ?
        (addressDetails.inputC === 1 ?
          new BigNumber(addressObj.balance).plus(addressDetails.inputT).toNumber():
          new BigNumber(addressObj.balance).minus(addressDetails.outputT).toNumber()
        ):
        (addressDetails.inputC === 1 ?
          new BigNumber(addressObj.balance).minus(addressDetails.inputT).toNumber():
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
      fs.unlink(path + file, (error) => {
        if (error) return Promise.reject(error);
      });
    }
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