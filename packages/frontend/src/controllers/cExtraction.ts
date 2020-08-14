import { Router, Request, Response } from 'express';
import iController from '../interfaces/iController';

class Block implements iController {
  public path = '/extraction'
  public apiPath = '/rest/api/1/extraction';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:addressHash`, this.getExtractionPage);
  }

  private getExtractionPage = (request: Request, response: Response) => {
    return response.render('extraction');
  }
}

export default Block;