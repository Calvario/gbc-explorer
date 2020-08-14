import { Router, Request, Response } from 'express';
import iController from '../interfaces/iController';


class Block implements iController {
  public path = '/block'
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:hash`, this.getBlockPage);
  }

  private getBlockPage = (request: Request, response: Response) => {
    return response.render('block');
  }
}

export default Block;