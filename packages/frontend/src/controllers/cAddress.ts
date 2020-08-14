import { Router, Request, Response } from 'express';
import iController from '../interfaces/iController';

class Address implements iController {
  public path = '/address'
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:addressHash`, this.getAddressPage);
  }

  private getAddressPage = (request: Request, response: Response) => {
    return response.render('address');
  }
}

export default Address;