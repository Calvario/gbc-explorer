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

import { EntityManager } from "typeorm";
import { mChainStatus } from '@calvario/gbc-explorer-shared';

export class ChainStatus {
  static async select(dbTransaction: EntityManager, statusName: string): Promise<mChainStatus> {
    return await dbTransaction.findOne(mChainStatus, {
      where: { name: statusName }
    })
      .then(async dbChainStatus => {
        if (dbChainStatus === undefined)
          return await this.create(dbTransaction, statusName);
        else
          return dbChainStatus;
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async create(dbTransaction: EntityManager, chainStatus: string): Promise<mChainStatus> {
    const chainStatusData: mChainStatus = {
      name: chainStatus,
    };

    const newChainStatus = dbTransaction.create(mChainStatus, chainStatusData);
    return await dbTransaction.save(newChainStatus)
      .catch((error) => {
        return Promise.reject(error);
      });
  }
}