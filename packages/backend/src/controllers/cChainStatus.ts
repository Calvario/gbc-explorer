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