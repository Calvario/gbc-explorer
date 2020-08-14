import { Router, Request, Response } from 'express';
import iController from '../interfaces/iController';
import swaggerUi from 'swagger-ui-express';

class Home implements iController {
  public path = ''
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.getHomePage);
    this.router.use(`${this.path}/api`, swaggerUi.serve);
    this.router.get(`${this.path}/api`, swaggerUi.setup(require('../../swagger.json')));
    this.router.get(`${this.path}/faq`, this.getFAQPage);
  }

  private getHomePage = async (request: Request, response: Response) => {
    return response.render('home');
  }

  private getFAQPage = async (request: Request, response: Response) => {
    return response.render('faq');
  }
}

export default Home;