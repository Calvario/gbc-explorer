import { Router, Request, Response, NextFunction } from 'express';
import { getRepository } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import mAddress from '../entity/mAddress';
import debug from 'debug';

class Address implements iController {
  public path = '/address'
  public apiPath = '/rest/api/address';
  public router = Router();
  private repository = getRepository(mAddress);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Frontend
    this.router.get(`${this.path}`, this.getAddressPage);

    // API
    this.router.get(`${this.apiPath}`, stringValidator(), this.getAddressAPI);
  }

  private getAddressPage = (request: Request, response: Response) => {
    if (request.query.hash !== undefined)
      return response.render('address');
    else
      return response.status(404);
  }

  private getAddressAPI = async (request: Request, response: Response) => {
    if (request.query.hash !== undefined)
      return this.getAddressByHash(response, request.query.hash.toString())
    else
      return this.getRichAddresses(response);
  }

  private getRichAddresses = async (response: Response) => {
    await this.repository.find({
      order: { "balance": "DESC" },
      take: 10
    })
    .then(addresses => {
      return response.json(addresses);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(500).send();
    });
  }

  private getAddressByHash = async (response: Response, addressHash: string) => {
    await this.repository.findOneOrFail({ address: addressHash })
    .then(address => {
      return response.json(address);
    })
    .catch((error) => {
      debug.log(error);
      return response.status(404).send('Address not found');
    });
  }
}

export default Address;