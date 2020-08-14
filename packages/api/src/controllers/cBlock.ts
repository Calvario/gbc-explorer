import { Router, Request, Response } from 'express';
import { getRepository, createQueryBuilder } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import { mBlock, mTransaction } from '@calvario/gbc-explorer-shared';
import debug from 'debug';


class Block implements iController {
  public path = '/rest/api/1/block';
  public router = Router();
  private repository = getRepository(mBlock);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, stringValidator(), this.getLatestBlocks);
    this.router.get(`${this.path}/:hash`, stringValidator(), this.getBlockByHash);
    this.router.get(`${this.path}/:hash/transactions`, stringValidator(), this.getTransactionsForBlock);
  }

  private getLatestBlocks = async (request: Request, response: Response) => {
    const qB = this.repository.createQueryBuilder("block")
    .innerJoinAndSelect("block.miner", "miner")
    .orderBy("block.height", "DESC")
    if (request.query.afterId !== undefined) qB.where("block.id < " + request.query.afterId.toString());
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getMany()
    .then(blocks => {
      return response.json(blocks);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getBlockByHash = async (request: Request, response: Response) => {
    const blockHash = request.params.hash;
    await this.repository.findOne({
      join: {
        alias: "block",
        innerJoinAndSelect: {
            miner: "block.miner",
            transactions: "block.transactions",
        }
      },
      where: { hash : blockHash },
      order: { "height": "DESC" }
    })
    .then(blocks => {
      return response.json(blocks);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getTransactionsForBlock = async (request: Request, response: Response) => {
    const blockHash = request.params.hash;
    await createQueryBuilder(mTransaction, "transaction")
    .innerJoin("transaction.block", "block")
    .innerJoinAndSelect("transaction.vins", "vin")
    .leftJoinAndSelect("vin.vout", "vinvout")
    .leftJoinAndSelect("vinvout.addresses", "vinaddress")
    .innerJoinAndSelect("transaction.vouts", "vout")
    .innerJoinAndSelect("vout.addresses", "address")
    .where("block.hash = :hash", { hash: blockHash })
    .orderBy("transaction.id", "ASC")
    .addOrderBy("vin.id", "ASC")
    .addOrderBy("vout.n", "ASC")
    .getMany()
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }
}

export default Block;