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

import { Router, Request, Response } from 'express';
import { getRepository } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import mCache from '../middlewares/mCache';
import { mPeerVersion } from '@calvario/gbc-explorer-shared';
import debug from 'debug';


class Peer implements iController {
  public path = '/rest/api/1/peer';
  public router = Router();
  private repository = getRepository(mPeerVersion);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, mCache(10), this.getNetworkSummary);
    this.router.get(`${this.path}/:version`, stringValidator(), this.getNetworkListForVersion);
  }

  private getNetworkSummary = async (request: Request, response: Response) => {
    const qB = this.repository.createQueryBuilder("version")
      .select('version.id', 'version_id')
      .addSelect('version.version', 'version_version')
      .addSelect('version.subVersion', 'version_subVersion')
      .addSelect('COUNT(peer.id)', 'version_count')
      .innerJoin('version.peers', 'peer')
      .where('peer.lastSeen >= (NOW() - interval \'24 hour\')')
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
      .where("version.id = :id", { id: version })
      .andWhere('peer.lastSeen >= (NOW() - interval \'24 hour\')')
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