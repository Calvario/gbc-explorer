import { Request, Response, Router } from 'express';
import { RPCClient } from 'rpc-bitcoin';
import iController from '../interfaces/iController';
import stringValidator from '../middlewares/mStringValidator';
import debug from 'debug';

class RPC implements iController {
	public path = '';
	public apiPath = '/rest/api/rpc';
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
		// this.router.get(`${this.apiPath}/getaddressinfo`, this.getaddressinfo);
		this.router.get(`${this.apiPath}/getblock`, stringValidator(), this.getblock);
		this.router.get(`${this.apiPath}/getblockchaininfo`, this.getblockchaininfo);
		this.router.get(`${this.apiPath}/getblockcount`, this.getblockcount);
		// this.router.get(`${this.apiPath}/getblockhash`, this.getblockhash);
		// this.router.get(`${this.apiPath}/getblockstats`, this.getblockstats);
		this.router.get(`${this.apiPath}/getchaintips`, this.getchaintips);
		// this.router.get(`${this.apiPath}/getchaintxstats`, this.getchaintxstats);
		this.router.get(`${this.apiPath}/getconnectioncount`, this.getconnectioncount);
		this.router.get(`${this.apiPath}/getdifficulty`, this.getdifficulty);
		// this.router.get(`${this.apiPath}/getmempoolancestors`, this.getmempoolancestors);
		// this.router.get(`${this.apiPath}/getmempooldescendants`, this.getmempooldescendants);
		// this.router.get(`${this.apiPath}/getmempoolentry`, this.getmempoolentry);
		this.router.get(`${this.apiPath}/getmempoolinfo`, this.getmempoolinfo);
		this.router.get(`${this.apiPath}/getmininginfo`, this.getmininginfo);
		this.router.get(`${this.apiPath}/getrawmempool`, this.getrawmempool);
		this.router.get(`${this.apiPath}/getrawtransaction`, stringValidator(), this.getrawtransaction);
		// this.router.get(`${this.apiPath}/gettxoutproof`, this.gettxoutproof);
		this.router.get(`${this.apiPath}/gettxoutsetinfo`, this.gettxoutsetinfo);
		// this.router.get(`${this.apiPath}/validateaddress`, this.validateaddress);
	}

	private getaddressinfo = async (request: Request, response: Response) => {
		// return response.json(await this.client.getaddressinfo())
	}

	private getblock = async (request: Request, response: Response) => {
		if (request.query.hash === undefined) {
			return response.status(405);
		}
		const blockHash: string = request.query.hash.toString();
		await this.client.getblock({blockhash: blockHash, verbosity: 2})
		.then(block => {
			return response.json(block);
		})
		.catch(error => {
			debug.log(error)
			return response.status(500);
		});
	}

	private getblockchaininfo = async (request: Request, response: Response) => {
		return response.json(await this.client.getblockchaininfo())
	}

	private getblockcount = async (request: Request, response: Response) => {
		return response.json(await this.client.getblockcount())
	}

	private getblockhash = async (request: Request, response: Response) => {
		// return response.json(await this.client.getblockhash())
	}

	private getblockstats = async (request: Request, response: Response) => {
		// return response.json(await this.client.getblockstats())
	}

	private getchaintips = async (request: Request, response: Response) => {
		return response.json(await this.client.getchaintips())
	}

	private getchaintxstats = async (request: Request, response: Response) => {
		// return response.json(await this.client.getchaintxstats())
	}

	private getconnectioncount = async (request: Request, response: Response) => {
		return response.json(await this.client.getconnectioncount())
	}

	private getdifficulty = async (request: Request, response: Response) => {
		return response.json(await this.client.getdifficulty())
	}

	private getmempoolancestors = async (request: Request, response: Response) => {
		// return response.json(await this.client.getmempoolancestors())
	}

	private getmempooldescendants = async (request: Request, response: Response) => {
		// return response.json(await this.client.getmempooldescendants())
	}

	private getmempoolentry = async (request: Request, response: Response) => {
		// return response.json(await this.client.getmempoolentry())
	}

	private getmempoolinfo = async (request: Request, response: Response) => {
		return response.json(await this.client.getmempoolinfo())
	}

	private getmininginfo = async (request: Request, response: Response) => {
		return response.json(await this.client.getmininginfo())
	}

	private getrawmempool = async (request: Request, response: Response) => {
		return response.json(await this.client.getrawmempool())
	}

	private getrawtransaction = async (request: Request, response: Response) => {
		if (request.query.txid === undefined) {
			return response.status(405);
		}
		const txID: string = request.query.txid.toString();
		await this.client.getrawtransaction({txid: txID, verbose: true})
		.then(transaction => {
			return response.json(transaction);
		})
		.catch(error => {
			debug.log(error)
			return response.status(500);
		});
	}

	private gettxoutproof = async (request: Request, response: Response) => {
		// return response.json(await this.client.gettxoutproof())
	}

	private gettxoutsetinfo = async (request: Request, response: Response) => {
		return response.json(await this.client.gettxoutsetinfo())
	}

	private validateaddress = async (request: Request, response: Response) => {
		// return response.json(await this.client.validateaddress())
	}
}

export default RPC;