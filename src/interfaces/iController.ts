import { Router } from 'express';

interface Controller {
  path: string;
  apiPath: string;
  router: Router;
}

export default Controller;