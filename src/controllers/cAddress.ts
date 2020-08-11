import { Router, Request, Response } from 'express';
import { getRepository, createQueryBuilder } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import mTransaction from '../entity/mTransaction';
import mVout from '../entity/mVout';
import mVin from '../entity/mVin';
import mAddress from '../entity/mAddress';

import debug from 'debug';

class Address implements iController {
  public path = '/address'
  public apiPath = '/rest/api/1/address';
  public router = Router();
  private repository = getRepository(mAddress);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Frontend
    this.router.get(`${this.path}/:addressHash`, this.getAddressPage);

    // API
    this.router.get(`${this.apiPath}`, stringValidator(), this.getRichAddresses);
    this.router.get(`${this.apiPath}/:hash`, stringValidator(), this.getAddressByHash);
    this.router.get(`${this.apiPath}/:hash/transactions`, stringValidator(), this.getTransactionsForAddress);
  }

  private getAddressPage = (request: Request, response: Response) => {
    return response.render('address');
  }

  private getRichAddresses = async (request: Request, response: Response)  => {
    const qB = this.repository.createQueryBuilder("address")
    .orderBy("balance", "DESC")
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getMany()
    .then(addresses => {
      return response.json(addresses);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getAddressByHash = async (request: Request, response: Response) => {
    const addressHash = request.params.hash;
    await this.repository.findOneOrFail({ address: addressHash })
    .then(address => {
      return response.json(address);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(404)
    });
  }

  private getTransactionsForAddress = async (request: Request, response: Response) => {
    const addressHash = request.params.hash;
    const qB = createQueryBuilder(mTransaction, "transaction")
    qB.innerJoinAndSelect("transaction.block", "block")
    .leftJoinAndSelect("transaction.vins", "vin", "vin.transaction = transaction.id AND vin.id IN " + qB.subQuery()
      .select("vin.id")
      .from(mVin, "vin")
      .innerJoin("vin.vout", "vout")
      .innerJoin("vout.addresses", "address")
      .where("address.address = :address", { address: addressHash })
      .getQuery()
    )
    .leftJoinAndSelect("vin.vout", "vinvout")
    .leftJoinAndSelect("transaction.vouts", "vout", "vout.transaction = transaction.id AND vout.id IN " + qB.subQuery()
      .select("vout.id")
      .from(mVout, "vout")
      .innerJoin("vout.addresses", "address")
      .where("address.address = :address", { address: addressHash })
      .getQuery()
    )
    .where("(vin.id IS NOT NULL OR vout.id IS NOT NULL)")
    .orderBy("transaction.id", "DESC")
    .addOrderBy("vin.id", "ASC")
    if (request.query.afterId !== undefined) qB.andWhere("transaction.id < " + request.query.afterId.toString());
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getMany()
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(404)
    });
  }
}

export default Address;