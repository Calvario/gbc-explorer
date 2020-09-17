import { Router, Request, Response } from 'express';
import { getConnection } from "typeorm";
import iController from '../interfaces/iController';
// import stringValidator from '../middlewares/mStringValidator';
import { mBlock, mVin } from '@calvario/gbc-explorer-shared';
import debug from 'debug';


class Chart implements iController {
  public path = '/rest/api/1/chart';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/circulation`, this.getCirculation);
    this.router.get(`${this.path}/difficulty`, this.getDifficulty);
    this.router.get(`${this.path}/blockchainSize`, this.getBlockchainSize);
    this.router.get(`${this.path}/transactionVolume`, this.getTransactionVolume);

    this.router.get(`${this.path}/extractionStats`, this.getExtractionStats);
    this.router.get(`${this.path}/rejectedBlocks`, this.getRejectedBlocks);
  }

  private getCirculation = async (request: Request, response: Response) => {
    const subQuery2 = getConnection().createQueryBuilder()
      .select('DATE(to_timestamp(block.time))', 'time')
      .addSelect('SUM(vout.value)', 'amount')
      .addSelect('AVG(CASE WHEN block.height = 1 THEN 0 ELSE vout.value END)', 'generation')
      .from(mVin, 'vin')
      .innerJoin("vin.transaction", "transaction")
      .innerJoin("transaction.vouts", "vout")
      .innerJoin("transaction.block", "block")
      .where('block.onMainChain = true')
      .andWhere('vin.coinbase = true')
      .groupBy('DATE(to_timestamp(block.time))')
      .orderBy('1', 'ASC')

    const subQuery1 = getConnection()
      .createQueryBuilder()
      .select('"subQuery2".time', 'time')
      .addSelect('SUM(SUM("subQuery2".amount)) OVER (ORDER BY "subQuery2".time ASC)', 'amount')
      .addSelect('"subQuery2".generation', 'generation')
      .from('(' + subQuery2.getQuery() + ')', 'subQuery2')
      .groupBy('"subQuery2".time, "subQuery2".generation')

    const qB = getConnection()
      .createQueryBuilder()
      .select('"subQuery1".time', 'time')
      .addSelect('"subQuery1".amount', 'amount')
      .addSelect('"subQuery1".generation', 'generation')
      .addSelect('("subQuery1".amount - LAG("subQuery1".amount, 1) OVER (ORDER BY "subQuery1".time ASC)) /  LAG("subQuery1".amount, 1) OVER (ORDER BY "subQuery1".time ASC) * 100 * 365.25', 'inflation')
      .from('(' + subQuery1.getQuery() + ')', 'subQuery1')

    await qB.getRawMany()
    .then(avgGeneration => {
      return response.json(avgGeneration);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getDifficulty = async (request: Request, response: Response) => {
    const qB = getConnection().createQueryBuilder()
    .select('DATE(to_timestamp(block.time))', 'time')
    .addSelect('COUNT(block.height)', 'blocks')
    .addSelect('AVG(block.difficulty)', 'difficulty')
    .addSelect('SUM(block.nTx)', 'transactions')
    .from(mBlock, 'block')
    .where('block.onMainChain = true')
    .groupBy('DATE(to_timestamp(block.time))')
    .orderBy('1', 'ASC')

    await qB.getRawMany()
    .then(difficulty => {
      return response.json(difficulty);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getBlockchainSize = async (request: Request, response: Response) => {
    const subQuery = getConnection().createQueryBuilder()
    .select('DATE(to_timestamp(block.time))', 'time')
    .addSelect('SUM(block.size)', 'size')
    .addSelect('AVG(block.size)', 'avgblocksize')
    .addSelect('AVG(block.nTx)', 'avgtransactions')
    .from(mBlock, 'block')
    .where('block.onMainChain = true')
    .groupBy('DATE(to_timestamp(block.time))')
    .orderBy('1', 'ASC')

  const qB = getConnection()
    .createQueryBuilder()
    .select('"dailyChain".time', 'time')
    .addSelect('SUM(SUM("dailyChain".size)) OVER (ORDER BY "dailyChain".time ASC) / 1048576', 'size')
    .addSelect('"dailyChain".avgblocksize / 1048576', 'avgblocksize')
    .addSelect('"dailyChain".avgtransactions', 'avgtransactions')
    .from('(' + subQuery.getQuery() + ')', 'dailyChain')
    .groupBy('"dailyChain".time, "dailyChain".avgblocksize, "dailyChain".avgtransactions')

    await qB.getRawMany()
    .then(avgBlockSize => {
      return response.json(avgBlockSize);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }

  private getTransactionVolume = async (request: Request, response: Response) => {
    const qB = getConnection().createQueryBuilder()
    .select('DATE(to_timestamp(block.time))', 'time')
    .addSelect('SUM(block.outputT)', 'volume')
    .addSelect('AVG(block.outputT)', 'avgAmount')
    .addSelect('AVG(transaction.fee)', 'avgFee')
    .from(mBlock, 'block')
    .innerJoin('block.transactions', 'transaction')
    .where('block.onMainChain = true')
    .andWhere('block.height > 500')
    .groupBy('DATE(to_timestamp(block.time))')
    .orderBy('1', 'ASC')

    await qB.getRawMany()
    .then(avgTransactionsPerBlock => {
      return response.json(avgTransactionsPerBlock);
    })
    .catch((error) => {
      debug.log(error);
      return response.sendStatus(500)
    });
  }
}

export default Chart;