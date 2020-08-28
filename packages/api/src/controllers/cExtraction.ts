import { Router, Request, Response } from 'express';
import { getRepository } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import { mBlock } from '@calvario/gbc-explorer-shared';
import debug from 'debug';

class Block implements iController {
  public path = '/rest/api/1/extraction';
  public router = Router();
  private repository = getRepository(mBlock);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/`, stringValidator(), this.getExtractionStats);
    this.router.get(`${this.path}/:addressHash`, stringValidator(), this.getExtractionForAddress);
  }

  private getExtractionPage = (request: Request, response: Response) => {
    return response.render('extraction');
  }

  private getExtractionStats = async (request: Request, response: Response) => {
    await this.repository.findOneOrFail({
      select: [ "height" ],
      order: { "height": "DESC" }
    })
    .then(async lastBlock => {
      const qB = this.repository.createQueryBuilder("block")
      .select("ROW_NUMBER() OVER (ORDER BY COUNT(miner.address) DESC)", "rank")
      .addSelect("COUNT(miner.address)", "count")
      .addSelect("miner.id", "id")
      .addSelect("miner.address", "address")
      .addSelect("miner.label", "label")
      .innerJoin("block.miner", "miner")
      .where("height >= :height", { height: lastBlock.height - 100 })
      .groupBy("miner.address")
      .addGroupBy("miner.label")
      .addGroupBy("miner.id")
      .orderBy("count", "DESC")
      request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

      await qB.getRawMany()
      .then(blocks => {
        return response.json(blocks);
      })
      .catch((error) => {
        debug.log(error);
        return response.sendStatus(500)
      });
    })
    .catch(error => {
      debug.log(error);
      return response.sendStatus(500)
    })
  }

  private getExtractionForAddress = async (request: Request, response: Response) => {
    const addressHash = request.params.addressHash;
    const qB = this.repository.createQueryBuilder("block")
    .innerJoin("block.miner", "miner")
    .where("miner.address = :address", { address: addressHash })
    .orderBy("block.height", "DESC")
    if (request.query.afterId !== undefined) qB.andWhere("block.id < " + request.query.afterId.toString());
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getMany()
    .then(blocks => {
      return response.json(blocks);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(404)
    });
  }
}

export default Block;