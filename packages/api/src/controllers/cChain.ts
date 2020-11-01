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
import { mChain } from '@calvario/gbc-explorer-shared';
import debug from 'debug';


class Chain implements iController {
  public path = '/rest/api/1/chain';
  public router = Router();
  private repository = getRepository(mChain);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, mCache(10), this.getChainList);
    this.router.get(`${this.path}/:id`, stringValidator(), this.getChainBlocks);
  }

  private getChainList = async (request: Request, response: Response) => {
    const qB = this.repository.createQueryBuilder('chain')
      .innerJoinAndSelect('chain.status', 'chainStatus')
      .where('chainStatus.name != \'active\'')
      .orderBy('chain.height', 'DESC')
    await qB.getMany()
      .then(chainList => {
        return response.json(chainList);
      })
      .catch((error) => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }

  private getChainBlocks = async (request: Request, response: Response) => {
    const dbId = request.params.id;
    await this.repository.createQueryBuilder('chain')
      .innerJoinAndSelect('chain.blocks', 'block')
      .where("chain.id = :id", { id: dbId })
      .orderBy('block.height', 'DESC')
      .getMany()
      .then(block => {
        return response.json(block);
      })
      .catch((error) => {
        debug.log(error);
        return response.sendStatus(500)
      });
  }
}

export default Chain;