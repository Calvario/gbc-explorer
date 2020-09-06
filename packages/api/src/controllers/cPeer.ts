import { Router, Request, Response } from 'express';
import { getRepository, createQueryBuilder } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import { mPeerVersion } from '@calvario/gbc-explorer-shared';
import debug from 'debug';


class Peer implements iController {
  public path = '/rest/api/1/peer';
  public router = Router();
  private repository = getRepository(mPeerVersion);
  private lastDay = new Date(new Date().getTime() - 86400000).toISOString();;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, stringValidator(), this.getNetworkSummary);
    this.router.get(`${this.path}/:version`, stringValidator(), this.getNetworkListForVersion);
  }

  private getNetworkSummary = async (request: Request, response: Response) => {
    const qB = this.repository.createQueryBuilder("version")
    .select('version.id', 'version_id')
    .addSelect('version.version', 'version_version')
    .addSelect('version.subVersion', 'version_subVersion')
    .addSelect('COUNT(peer.id)', 'version_count')
    .innerJoin('version.peers', 'peer')
    .where('peer.lastSeen >= :date', { date : this.lastDay })
    .groupBy('version.id, version.version, version.subVersion')
    .orderBy('version_count', 'DESC')
    await qB.getRawMany()
    .then(networkSummary => {
      return response.json(networkSummary);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getNetworkListForVersion = async (request: Request, response: Response) => {
    const version = request.params.version;
    await this.repository.createQueryBuilder("version")
    .innerJoinAndSelect('version.peers', 'peer')
    .where("version.id = :id", { id : version })
    .andWhere('peer.lastSeen >= :date', { date : this.lastDay })
    .getOne()
    .then(block => {
      return response.json(block);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }
}

export default Peer;