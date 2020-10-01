import { EntityManager } from "typeorm";
import { mPeerVersion } from '@calvario/gbc-explorer-shared';

export class PeerVersion {
  static async select(dbTransaction: EntityManager, peerVersion: number, peerSubVersion: string): Promise<mPeerVersion> {
    return await dbTransaction.findOne(mPeerVersion, {
      where: { version: peerVersion, subVersion: peerSubVersion }
    })
      .then(async dbPeerVersion => {
        if (dbPeerVersion === undefined)
          return await this.create(dbTransaction, peerVersion, peerSubVersion);
        else
          return dbPeerVersion;
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async create(dbTransaction: EntityManager, peerVersion: number, peerSubVersion: string): Promise<mPeerVersion> {
    const peerVersionData: mPeerVersion = {
      version: peerVersion,
      subVersion: peerSubVersion,
    };

    const newPeerVersion = dbTransaction.create(mPeerVersion, peerVersionData);
    return await dbTransaction.save(newPeerVersion)
      .catch((error) => {
        return Promise.reject(error);
      });
  }
}