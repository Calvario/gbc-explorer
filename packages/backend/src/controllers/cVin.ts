import BigNumber from "bignumber.js"
import { EntityManager } from "typeorm";
import { mTransaction, mVin, mVout } from '@calvario/gbc-explorer-shared';

BigNumber.config({ DECIMAL_PLACES: 9 })

export class Vin {
  static async create(dbTransaction: EntityManager, transactionObj: mTransaction, vinInfo: any, voutObj: mVout | undefined): Promise<mVin> {
    const vinData: mVin = {
      transaction: transactionObj,
      coinbase: (!vinInfo.coinbase ? false : true),
      vout: voutObj,
    };

    const newVin = dbTransaction.create(mVin, vinData);
    return await dbTransaction.save(newVin)
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }
}