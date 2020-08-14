import { Request, Response, Router } from 'express';
import { RPCClient } from 'rpc-bitcoin';
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import debug from 'debug';

class RPC implements iController {
  public path = '/rest/api/1/rpc';
  public router = Router();
  private client: RPCClient;

  constructor() {
    this.initializeRoutes();
    this.client = this.rpcConnection();
  }

  private rpcConnection() {
    const url = process.env.RPC_HOST;
    const user = process.env.RPC_USERNAME;
    const pass = String(process.env.RPC_PASSWORD);
    const port = Number(process.env.RPC_PORT);
    const timeout = Number(process.env.RPC_TIMEOUT);
    return new RPCClient({ url, port, timeout, user, pass });
  }

    private initializeRoutes() {
    // API
    this.router.get(`${this.path}/getaddressinfo/:address`, stringValidator(), this.getaddressinfo);
    this.router.get(`${this.path}/getblock/:hash`, stringValidator(), this.getblock);
    this.router.get(`${this.path}/getblockchaininfo`, this.getblockchaininfo);
    this.router.get(`${this.path}/getblockcount`, this.getblockcount);
    this.router.get(`${this.path}/getblockhash/:height`, stringValidator(), this.getblockhash);
    this.router.get(`${this.path}/getblockstats/:block`, stringValidator(), this.getblockstats);
    this.router.get(`${this.path}/getchaintips`, this.getchaintips);
    this.router.get(`${this.path}/getchaintxstats`, stringValidator(), this.getchaintxstats);
    this.router.get(`${this.path}/getconnectioncount`, this.getconnectioncount);
    this.router.get(`${this.path}/getdifficulty`, this.getdifficulty);
    this.router.get(`${this.path}/getmempoolancestors/:txid`, stringValidator(), this.getmempoolancestors);
    this.router.get(`${this.path}/getmempooldescendants/:txid`, stringValidator(), this.getmempooldescendants);
    this.router.get(`${this.path}/getmempoolentry/:txid`, stringValidator(), this.getmempoolentry);
    this.router.get(`${this.path}/getmempoolinfo`, this.getmempoolinfo);
    this.router.get(`${this.path}/getmininginfo`, this.getmininginfo);
    this.router.get(`${this.path}/getrawmempool`, this.getrawmempool);
    this.router.get(`${this.path}/getrawtransaction/:txid`, stringValidator(), this.getrawtransaction);
    this.router.get(`${this.path}/gettxoutproof`, stringValidator(), this.gettxoutproof);
    this.router.get(`${this.path}/gettxoutsetinfo`, this.gettxoutsetinfo);
}

  private verbosityCheck(verbosity: string) {
    if (Number(verbosity) === 0)
      return 0;
    else if (Number(verbosity) === 1)
      return 1;
    else if (Number(verbosity) === 2)
      return 2;
    else
      return undefined;
  }

  private getaddressinfo = async (request: Request, response: Response) => {
    const qAddress: string = request.params.hash;
    await this.client.getaddressinfo({
      address: qAddress
    })
    .then(addressInfo => {
      return response.json(addressInfo);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getblock = async (request: Request, response: Response) => {
    const qBlockHash: string = request.params.hash;
    const qVerbosity = request.query.verbosity === undefined ? 0 : this.verbosityCheck(request.query.verbosity.toString())
    await this.client.getblock({
      blockhash: qBlockHash,
      verbosity: qVerbosity
    })
    .then(block => {
      return response.json(block);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500);
    });
  }

  private getblockchaininfo = async (request: Request, response: Response) => {
    await this.client.getblockchaininfo()
    .then(blockchainInfo => {
      return response.json(blockchainInfo);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getblockcount = async (request: Request, response: Response) => {
    await this.client.getblockcount()
    .then(blockCount => {
      return response.json(blockCount);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getblockhash = async (request: Request, response: Response) => {
    const qHeight: number = Number(request.params.height);
    await this.client.getblockhash({
      height: qHeight
    })
    .then(blockHash => {
      return response.json(blockHash);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getblockstats = async (request: Request, response: Response) => {
    const qBlock: string = request.params.block;
    const qStats: undefined | string[] = request.query.stat === undefined ? undefined :  [request.query.stat.toString()]; // TODO: Allow array of strings
    await this.client.getblockstats({
      hash_or_height: qBlock,
      stats: qStats
    })
    .then(blockStats => {
      return response.json(blockStats);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getchaintips = async (request: Request, response: Response) => {
    await this.client.getchaintips()
    .then(chainTips => {
      return response.json(chainTips);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getchaintxstats = async (request: Request, response: Response) => {
    const qNBlocks: number | undefined = Number(request.query.nBlocks);
    const qBlockHash: string | undefined = request.query.blockHash?.toString();
    await this.client.getchaintxstats({
      nblocks: qNBlocks,
      blockhash: qBlockHash
    })
    .then(chainTxStats => {
      return response.json(chainTxStats);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getconnectioncount = async (request: Request, response: Response) => {
    await this.client.getconnectioncount()
    .then(connectionCount => {
      return response.json(connectionCount);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getdifficulty = async (request: Request, response: Response) => {
    await this.client.getdifficulty()
    .then(difficulty => {
      return response.json(difficulty);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getmempoolancestors = async (request: Request, response: Response) => {
    const qTxID: string = request.params.txid;
    const qVerbose: boolean = Boolean(request.query.verbose?.toString()) === false ? false : true;
    await this.client.getmempoolancestors({
      txid: qTxID,
      verbose: qVerbose
    })
    .then(mempoolAncestors => {
      return response.json(mempoolAncestors);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getmempooldescendants = async (request: Request, response: Response) => {
    const qTxID: string = request.params.txid;
    const qVerbose: boolean = Boolean(request.query.verbose?.toString()) === false ? false : true;
    await this.client.getmempooldescendants({
      txid: qTxID,
      verbose: qVerbose
    })
    .then(mempoolDescendants => {
      return response.json(mempoolDescendants);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getmempoolentry = async (request: Request, response: Response) => {
    const qTxID: string = request.params.txid;
    await this.client.getmempoolentry({
      txid: qTxID
    })
    .then(mempoolEntry => {
      return response.json(mempoolEntry);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getmempoolinfo = async (request: Request, response: Response) => {
    await this.client.getmempoolinfo()
    .then(mempoolInfo => {
      return response.json(mempoolInfo);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getmininginfo = async (request: Request, response: Response) => {
    await this.client.getmininginfo()
    .then(miningInfo => {
      return response.json(miningInfo);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getrawmempool = async (request: Request, response: Response) => {
    const qVerbose: boolean = Boolean(request.query.verbose?.toString()) === false ? false : true;
    await this.client.getrawmempool({
      verbose: qVerbose
    })
    .then(rawMempool => {
      return response.json(rawMempool);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private getrawtransaction = async (request: Request, response: Response) => {
    const qTxID: string = request.params.txid;
    const qVerbose: boolean = Boolean(request.query.verbose?.toString()) === false ? false : true;
    await this.client.getrawtransaction({
      txid: qTxID,
      verbose: qVerbose
    })
    .then(rawTransaction => {
      return response.json(rawTransaction);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private gettxoutproof = async (request: Request, response: Response) => {
    if (request.query.txid === undefined) {
      return response.sendStatus(405)
    }
    const qTxID: string = request.query.txid.toString(); // TODO: Allow array of strings
    const qBlockHash: string | undefined = request.query.blockHash === undefined ? undefined : request.query.blockHash.toString()
    await this.client.gettxoutproof({
      txids: [qTxID],
      blockhash: qBlockHash
    })
    .then(txOutProof => {
      return response.json(txOutProof);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }

  private gettxoutsetinfo = async (request: Request, response: Response) => {
    await this.client.gettxoutsetinfo()
    .then(txoutSetInfo => {
      return response.json(txoutSetInfo);
    })
    .catch(error => {
      debug.log(error)
      return response.sendStatus(500)
    });
  }
}

export default RPC;