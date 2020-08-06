import { Router, Request, Response, NextFunction } from 'express';
import { getRepository } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import mBlock from '../entity/mBlock';
import debug from 'debug';

class Block implements iController {
  public path = '/block'
  public apiPath = '/rest/api/block';
  public router = Router();
  private repository = getRepository(mBlock);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Frontend
    this.router.get(`${this.path}`, this.getBlockPages);
    // API
    this.router.get(`${this.apiPath}`, stringValidator(), this.getBlockAPI);
    this.router.get(`${this.apiPath}/extraction`, stringValidator(), this.getExtractionAPI);
  }

  private getBlockPages = (request: Request, response: Response) => {
    if (request.query.hash !== undefined)
      return response.render('block');
    else if (request.query.addressHash !== undefined)
      return response.render('extraction');
    else
      return response.status(404);
  }

  private getBlockAPI = async (request: Request, response: Response) => {
    if (request.query.hash !== undefined)
      return this.getBlockByHash(response, request.query.hash.toString())
    else
      return this.getLatestBlocks(response);
  }

  private getLatestBlocks = async (response: Response) => {
    await this.repository.find({
      join: {
        alias: "block",
        innerJoinAndSelect: {
            miner: "block.miner",
        }
      },
      order: { "height": "DESC" },
      take: 10
    })
    .then(blocks => {
      return response.json(blocks);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(500).send();
    });
  }

  private getBlockByHash = async (response: Response, blockHash: string) => {
    await this.repository.createQueryBuilder("block")
    .innerJoinAndSelect("block.transactions", "transaction")
    .innerJoinAndSelect("block.miner", "mineraddress")
    .innerJoinAndSelect("transaction.vins", "vin")
    .leftJoinAndSelect("vin.vout", "vinvout")
    .leftJoinAndSelect("vinvout.transaction", "vintransaction")
    .leftJoinAndSelect("vinvout.addresses", "vinaddress")
    .innerJoinAndSelect("transaction.vouts", "vout")
    .innerJoinAndSelect("vout.addresses", "voutaddress")
    .where("block.hash = :hash", { hash: blockHash })
    .orderBy("transaction.id", "ASC")
    .addOrderBy("vinaddress.address", "ASC")
    .addOrderBy("voutaddress.address", "ASC")
    .getOne()
    .then(block => {
      if (block === undefined)
        return response.status(404).send('Block not found');
      else
        return response.json(block);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(500).send('Error');
    });
  }

  private getExtractionAPI = async (request: Request, response: Response) => {
    if(request.query.addressHash)
      return this.getExtractionForAddress(response, request.query.addressHash.toString())
    else
      return this.getExtractionStats(response);
  }

  private getExtractionStats = async (response: Response) => {
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

  private getExtractionForAddress = async (response: Response, addressHash: string) => {
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