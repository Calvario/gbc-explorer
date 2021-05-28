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
    return dbTransaction.save(newVin)
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }
}