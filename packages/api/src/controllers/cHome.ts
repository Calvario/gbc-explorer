import { Router, Request, Response } from 'express';
import { getRepository, Like } from "typeorm";
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import { mBlock, mTransaction, mAddress } from '@calvario/gbc-explorer-shared';
import debug from 'debug';

class Home implements iController {
  public path = ''
  public apiPath = '/rest/api/1/general';
  public router = Router();
  private blockRepository = getRepository(mBlock);
  private transactionRepository = getRepository(mTransaction);
  private addressRepository = getRepository(mAddress);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.apiPath}`, stringValidator(), this.getSearch);
  }

  private getSearch = async (request: Request, response: Response) => {
    if(request.query.search === undefined) {
      return response.sendStatus(405)
    }

    const searchPattern = request.query.search.toString();
    const strRegex = RegExp('(?=.*?[0-9])(?=.*?[A-Za-z]).+');
    const numRegex = RegExp('^[0-9]*$');
    const results: { _id: string, type: string }[] = Array()

    // Search for all
    if(strRegex.test(searchPattern)) {
      await this.blockRepository.find({
        select: ["hash"],
        where: { hash: Like(`%${searchPattern}%`) },
        take: 10
      })
      .then(blocks => {
        for (const block of blocks) {
          results.push({ _id: block.hash, type: 'block'});
        }
      })
      .catch(error => {
        debug.log(error);
      })

      await this.transactionRepository.find({
        select: ["hash"],
        where: { hash: Like(`%${searchPattern}%`) },
        take: 10
      })
      .then(transactions => {
        for (const transaction of transactions) {
          results.push({ _id: transaction.hash, type: 'transaction'});
        }
      })
      .catch(error => {
        debug.log(error);
      })

      await this.addressRepository.find({
        select: ["address"],
        where: { address: Like(`%${searchPattern}%`) },
        take: 10
      })
      .then(addresses => {
        for (const address of addresses) {
          results.push({ _id: address.address, type: 'address'});
        }
      })
      .catch(error => {
        debug.log(error);
      })

      return response.json(results);

    // Search for blocks
    } else if(numRegex.test(searchPattern)) {
      await this.blockRepository.find({
        select: ["hash"],
        where: { height: searchPattern, onMainChain: true },
        take: 10
      }).then(blocks => {
        for (const block of blocks) {
          results.push({ _id: block.hash, type: 'block'});
        }
      })
      .catch(error => {
        debug.log(error);
      })

      return response.json(results);

    // Invalid pattern
    } else {
      return response.sendStatus(405);
    }
  }
}

export default Home;