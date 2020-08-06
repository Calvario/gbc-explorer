import { Router, Request, Response, NextFunction } from 'express';
import { getRepository } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import mTransaction from '../entity/mTransaction';
import debug from 'debug';

class Transaction implements iController {
  public path = '/transaction'
  public apiPath = '/rest/api/transaction';
  public router = Router();
  private repository = getRepository(mTransaction);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Frontend
    this.router.get(`${this.path}`, this.getTransactionPage);

    // API
    this.router.get(`${this.apiPath}`, stringValidator(), this.getTransactionAPI);
  }

  private getTransactionPage = async (request: Request, response: Response) => {
    if (request.query.hash !== undefined)
      return response.render('transaction');
    else
      return response.status(404);
  }

  private getTransactionAPI = async (request: Request, response: Response) => {
    if (request.query.hash !== undefined)
      return this.getTransactionByHash(response, request.query.hash.toString())
    else if (request.query.blockHash !== undefined)
      return this.getTransactionsForBlock(response, request.query.blockHash.toString());
    else if (request.query.addressHash !== undefined)
      return this.getTransactionsForAddress(response, request.query.addressHash.toString());
    else
      return this.getLatestTransactions(response);
  }

  private getLatestTransactions = async (response: Response) => {
    await this.repository.find({
      join: {
        alias: "transaction",
        innerJoinAndSelect: {
            block: "transaction.block",
        }
      },
      order: { "block": "DESC" },
      take: 10
    })
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(500).send();
    });
  }

  private getTransactionByHash = async (response: Response, hashParam: string) => {
    await this.repository.createQueryBuilder("transaction")
    .innerJoinAndSelect("transaction.block", "block")
    .innerJoinAndSelect("transaction.vins", "vin")
    .leftJoinAndSelect("vin.vout", "vinvout")
    .leftJoinAndSelect("vinvout.transaction", "vintransaction")
    .leftJoinAndSelect("vinvout.addresses", "vinaddress")
    .innerJoinAndSelect("transaction.vouts", "vout")
    .innerJoinAndSelect("vout.addresses", "address")
    .leftJoinAndSelect("vout.vin", "voutvin")
    .leftJoinAndSelect("voutvin.transaction", "voutvintransaction")
    .where("transaction.hash = :hash", { hash: hashParam })
    .orderBy("block", "DESC" )
    .getOne()
    .then( transaction => {
      return response.json(transaction);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(404).send('Transaction not found');
    });
  }

  private getTransactionsForBlock = async (response: Response, hashParam: string) => {
    await this.repository.find({
      join: {
        alias: "transaction",
        innerJoinAndSelect: {
            block: "transaction.block",
        }
      },
      where: { "block.hash": hashParam },
      order: { id: "ASC" }
    })
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(500).send();
    });
  }

  private getTransactionsForAddress = async (response: Response, addressHash: string) => {
    await this.repository.createQueryBuilder("transaction")
    .innerJoinAndSelect("transaction.block", "block")
    .innerJoinAndSelect("transaction.vins", "vin")
    .innerJoinAndSelect("vin.vout", "vinvout")
    .innerJoinAndSelect("vinvout.transaction", "vintransaction")
    .innerJoinAndSelect("vinvout.addresses", "vinaddress")
    .innerJoinAndSelect("transaction.vouts", "vout")
    .innerJoinAndSelect("vout.addresses", "address")
    .leftJoinAndSelect("vout.vin", "voutvin")
    .leftJoinAndSelect("voutvin.transaction", "voutvintransaction")
    .where("vinaddress.address = :address", { address: addressHash })
    .orWhere("address.address = :address", { address: addressHash })
    .take(10)
    .getMany()
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(404).send('Transactions not found');
    });
  }
}

export default Transaction;