import { Router, Request, Response } from 'express';
import iController from '../interfaces/iController';

class Transaction implements iController {
  public path = '/transaction'
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:hash`, this.getTransactionPage);
  }

  private getTransactionPage = async (request: Request, response: Response) => {
    return response.render('transaction');
  }
}

export default Transaction;