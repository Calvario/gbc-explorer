import { Router, Request, Response } from 'express';
import { getRepository, createQueryBuilder } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import mAddress from '../entity/mAddress';
import mTransaction from '../entity/mTransaction';
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
      return response.status(500).send();
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
      return response.status(404).send('Address not found');
    });
  }

  private getTransactionsForAddress = async (request: Request, response: Response) => {
    const addressHash = request.params.hash;
    const qB = createQueryBuilder(mTransaction, "transaction")
    .innerJoinAndSelect("transaction.block", "block")
    .innerJoinAndSelect("transaction.vins", "vin")
    .leftJoinAndSelect("vin.vout", "vinvout")
    .leftJoinAndSelect("vinvout.addresses", "vinaddress")
    .innerJoinAndSelect("transaction.vouts", "vout")
    .innerJoinAndSelect("vout.addresses", "address")
    .where("vinaddress.address = :address", { address: addressHash })
    .orWhere("address.address = :address", { address: addressHash })
    .orderBy("transaction.id", "DESC")
    if (request.query.afterId !== undefined) qB.andWhere("transaction.id < " + request.query.afterId.toString());
    request.query.limit === undefined || Number(request.query.limit) > 100 ? qB.limit(10) : qB.limit(Number(request.query.limit.toString()));

    await qB.getMany()
    .then(transactions => {
      return response.json(transactions);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(404).send('Transactions not found');
    });
  }
}

export default Address;