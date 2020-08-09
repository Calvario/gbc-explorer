import { Router, Request, Response } from 'express';
import { getRepository } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import mBlock from '../entity/mBlock';
import debug from 'debug';

class Block implements iController {
  public path = '/extraction'
  public apiPath = '/rest/api/1/extraction';
  public router = Router();
  private repository = getRepository(mBlock);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Frontend
    this.router.get(`${this.path}/:addressHash`, this.getExtractionPage);

    // API
    this.router.get(`${this.apiPath}/`, stringValidator(), this.getExtractionStats);
    this.router.get(`${this.apiPath}/:addressHash`, stringValidator(), this.getExtractionForAddress);
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
      await this.repository.createQueryBuilder("block")
      .select("COUNT(miner.address)", "count")
      .addSelect("miner.address", "address")
      .addSelect("miner.label", "label")
      .innerJoin("block.miner", "miner")
      .where("height >= :height", { height: lastBlock.height - 100 })
      .groupBy("miner.address")
      .addGroupBy("miner.label")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany()
      .then(blocks => {
        return response.json(blocks);
      })
      .catch((error) => {
        debug.log(error);
        return response.status(500).send();
      });
    })
    .catch(error => {
      debug.log(error);
      return response.status(500).send();
    })
  }

  private getExtractionForAddress = async (request: Request, response: Response) => {
    const addressHash = request.params.addressHash;
    await this.repository.createQueryBuilder("block")
    .innerJoin("block.miner", "miner")
    .where("miner.address = :address", { address: addressHash })
    .limit(10)
    .getMany()
    .then(blocks => {
      return response.json(blocks);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(404).send('Address not found');
    });
  }
}

export default Block;