import debug from 'debug';
import fs from 'fs';
import { RPCClient } from 'rpc-bitcoin';
import { getRepository, getManager, EntityManager } from "typeorm";
import BigNumber from "bignumber.js"
import { mBlock, mTransaction, mAddress, mVin, mVout } from '@calvario/gbc-explorer-shared';

BigNumber.config({ DECIMAL_PLACES: 9 })

class Blockchain {

  public client: RPCClient;
  public blockRepository = getRepository(mBlock);
  public addressRepository = getRepository(mAddress);

  constructor() {
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

  public sync = async () => {
    const lastBlock = await this.client.getblockcount()
    .catch(error => {
      debug.log(error);
    });

    await this.blockRepository.findOneOrFail({
      select: ["height"],
      order: { height: 'DESC' }
    })
    .then(async (block) => {
      await loop(this.client, Number(block.height) + 1, lastBlock);
    })
    .catch(async () => {
      await loop(this.client, 1, lastBlock);
    })
  }

  public updateLabelForAddresses = async (path: string) => {
    const file = 'labels.json'

    try {
      const fileExist = fs.existsSync(path + file);
      if (!fileExist) return undefined;

      const rawdata = fs.readFileSync(path + file, 'utf8');
      const addressesLabel: [{ address: string, label: string }] = JSON.parse(rawdata);

      if(addressesLabel) {
        for(const addressJSON of addressesLabel) {
          await this.addressRepository.findOne(({ address: addressJSON.address }))
          .then(async address => {
            if(address) {
              address.label = addressJSON.label;
              await this.addressRepository.update(address.id!, address)
              debug.log(address.address + ' updated with label: ' + addressJSON.label)
            } else {
              debug.log(addressJSON.address + ' not found.')
            }
          })
        }
        fs.unlink(path + file, (error) => {
          if (error) debug.log(error);
        });
      }
    } catch (error) {
      debug.log('Incorrect file format for ' + file);
      fs.unlink(path + file, (error) => {
        if (error) debug.log(error);
      });
    }
  }
}

export default Blockchain;

async function loop(rpc: RPCClient, start: number, end: number) {
  let counter: number = start;
  while (counter <= end){
    debug.log('-- START Heigh: ' + counter);
    const blockHash = await rpc.getblockhash({height: counter})
    .catch(error => {
      debug.log(error);
    });
    const blockInfo = await rpc.getblock({blockhash: blockHash, verbosity: 2})
    .catch(error => {
      debug.log(error)
    });

    // Create a big transaction
    await getManager().transaction(async transactionalEntityManager => {
      // 1. Create block
      await createBlock(transactionalEntityManager, blockInfo)
      .then(async (blockObj: mBlock) => {
        // Initialization of block update variable
        let blockInputC: BigNumber = new BigNumber(0);
        let blockInputT: BigNumber = new BigNumber(0);
        let blockOutputC: BigNumber = new BigNumber(0);
        let blockOutputT: BigNumber = new BigNumber(0);
        let blockFeesT: BigNumber = new BigNumber(0);
        let blockGeneration: BigNumber = new BigNumber(0);
        let blockMiner: mAddress | undefined;

        // 2. Loop on each transaction
        for(const transactionInfo of blockInfo.tx) {
          // 3. Create Transaction
          await createTransaction(transactionalEntityManager, blockObj, transactionInfo)
          .then( async (transactionObj: mTransaction) => {
            // Initialization of transaction update variable
            let tInputC: BigNumber = new BigNumber(0);;
            let tInputT: BigNumber = new BigNumber(0);
            let tOutputC: BigNumber = new BigNumber(0);;
            let tOutputT: BigNumber = new BigNumber(0);
            let tFee: BigNumber;

            // 4. Loop for each VINs
            for(const vinInfo of transactionInfo.vin) {
              // 5. Check the VOUT transaction associated with the VIN
              await checkVinTransaction(transactionalEntityManager, vinInfo)
              .then (async (vinVout: mVout) => {
                // 6. Create VIN
                await createVin(transactionalEntityManager, transactionObj, vinVout, vinInfo);

                // Update transation and block variables for output
                tInputC = tInputC.plus(1);
                tInputT = vinVout === undefined ? new BigNumber(0) : tInputT.plus(new BigNumber(vinVout.value));
              })
            };
            blockInputC = blockInputC.plus(tInputC);
            blockInputT = blockInputT.plus(tInputT);

            // 7. Loop for each VOUTs
            for (const voutInfo of transactionInfo.vout) {
              // 8. Loop for each addresses and search them (or create them if needed) returning an array with ID's
              await checkVoutAddresses(transactionalEntityManager, voutInfo)
              .then(async addressesArrayObj => {
                // 9. Create VOUT
                await createVout(transactionalEntityManager, transactionObj, addressesArrayObj, voutInfo);

                // Update transation variables for output
                tOutputC = tOutputC.plus(1);
                tOutputT = tOutputT.plus(new BigNumber(voutInfo.value));
                if(transactionInfo.vin[0].coinbase !== undefined && voutInfo.n === 0) blockMiner = addressesArrayObj[0];
              })
              .catch(error => {
                debug.log(error)
              })
            }

            // Update block variable
            blockOutputC = blockOutputC.plus(tOutputC);
            blockOutputT = blockOutputT.plus(tOutputT);
            tFee = (transactionInfo.vin[0].coinbase !== undefined ? new BigNumber(0) : tInputT.minus(tOutputT))
            blockFeesT = blockFeesT.plus(tFee);
            blockGeneration = (transactionInfo.vin[0].coinbase !== undefined ? blockGeneration.plus(tOutputT) : blockGeneration.minus(tFee));

            // 10. Update transaction
            await updateTransaction(transactionalEntityManager, transactionObj, tInputC.toNumber(), tInputT, tOutputC.toNumber(), tOutputT, tFee)
            .catch(error => {
              debug.log(error);
            })
          });
        }

        // 11. Update block
        await updateBlock(transactionalEntityManager, blockObj, blockInputC.toNumber(), blockInputT, blockOutputC.toNumber(), blockOutputT, blockFeesT, blockMiner, blockGeneration)
        .catch(error => {
          debug.log(error);
        })
        .then(async () => {
          if(blockObj.height !== 1) {
            await updatePreviousBlock(transactionalEntityManager, blockObj);
          }
        });
        debug.log('-- END Heigh: ' + counter);
      })
      .catch(error => {
        debug.log(error);
      })
    });
    // Jump to the next block
    counter++
  }
}

async function createBlock(transaction: EntityManager, blockInfo: any): Promise<any> {
  const blockData: mBlock = {
    hash: blockInfo.hash,
    onMainChain: (blockInfo.confirmation === -1 ? false : true),
    strippedsize: blockInfo.strippedsize,
    size: blockInfo.size,
    mint: blockInfo.mint,
    weight: blockInfo.weight,
    height: blockInfo.height,
    version: blockInfo.version,
    merkleroot: blockInfo.merkleroot,
    time: blockInfo.time,
    nonce: blockInfo.nonce,
    bits: blockInfo.bits,
    difficulty: blockInfo.difficulty,
    chainwork: blockInfo.chainwork,
    nTx: blockInfo.nTx,
    previousblockhash: blockInfo.previousblockhash,
    nextblockhash: blockInfo.nextblockhash,
  };

  const newBlock = transaction.create(mBlock, blockData);
  return await transaction.save(newBlock)
  .catch((error: any) => {
    debug.log(error);
  });
}

async function updateBlock(transaction: EntityManager, blockObj: mBlock, bInputC: number, bInputT: BigNumber, bOutputC: number, bOutputT: BigNumber, bFeesT: BigNumber, bMiner: mAddress | undefined, bGeneration: BigNumber): Promise<any> {

  blockObj.inputC = bInputC;
  blockObj.inputT = bInputT.toNumber();
  blockObj.outputC = bOutputC;
  blockObj.outputT = bOutputT.toNumber();
  blockObj.feesT = bFeesT.toNumber();
  blockObj.miner = bMiner;
  blockObj.generation = bGeneration.toNumber();

  return await transaction.update(mBlock, blockObj.id!, blockObj)
  .catch((error: any) => {
    debug.log(error);
  });
}

async function updatePreviousBlock(transaction: EntityManager, blockObj: mBlock): Promise<any> {
  await transaction.findOneOrFail(mBlock, { hash: blockObj.previousblockhash })
  .then(async previousBlockObj => {
    previousBlockObj.nextblockhash = blockObj.hash;
    return await transaction.update(mBlock, previousBlockObj.id!, previousBlockObj)
    .catch((error: any) => {
      debug.log(error);
    });
  })
  .catch(error => {
    debug.log(error)
  })
}

async function createTransaction (transaction: EntityManager, blockObj: mBlock, transactionInfo: any): Promise<any> {
  const transactionData: mTransaction = {
    txid: transactionInfo.txid,
    hash: transactionInfo.hash,
    version: transactionInfo.version,
    time: transactionInfo.time,
    size: transactionInfo.size,
    vsize: transactionInfo.vsize,
    locktime: transactionInfo.locktime,
    block: blockObj,
  };

  const newTransaction = transaction.create(mTransaction, transactionData);
  return await transaction.save(newTransaction)
  .catch((error: any) => {
    debug.log(error);
  });
}

async function updateTransaction (transaction: EntityManager, transactionObj: mTransaction, tInputC: number, tInputT: BigNumber,  tOutputC: number, tOutputT: BigNumber, tFee: BigNumber): Promise<any> {

  transactionObj.inputC = tInputC;
  transactionObj.inputT = tInputT.toNumber();
  transactionObj.outputC = tOutputC,
  transactionObj.outputT = tOutputT.toNumber(),
  transactionObj.fee = tFee.toNumber();

  return await transaction.update(mTransaction, transactionObj.id!, transactionObj)
  .catch((error: any) => {
    debug.log(error);
  });
}

async function createVin (transaction: EntityManager, transactionObj: mTransaction, vinVoutObj: mVout | undefined, vinInfo: any): Promise<any> {
  const vinData: mVin = {
    transaction: transactionObj,
    coinbase: (!vinInfo.coinbase ? false : true),
    vout: vinVoutObj,
  };

  const newVin = transaction.create(mVin, vinData);
  return await transaction.save(newVin)
  .catch((error: any) => {
    debug.log(error);
  });
}

async function checkVinTransaction (transaction: EntityManager, vinInfo: any): Promise<any> {
  if (vinInfo.txid !== undefined && vinInfo.vout !== undefined) {
    return await transaction.findOneOrFail(mTransaction, { txid: vinInfo.txid })
    .then(async transactionObj => {
      return await transaction.findOneOrFail(mVout, {
        where: {transaction: transactionObj.id, n: vinInfo.vout },
        relations: ["addresses"]
      });
    }).then(async vout => {
      await updateAddress(transaction, vout.addresses[0], 0, new BigNumber(0), 1, new BigNumber(vout.value))
      return vout;
    }).catch(error => {
      debug.log(error);
      return undefined;
    })
  } else {
    return undefined;
  }
}

async function createVout (transaction: EntityManager, transactionObj: mTransaction, addressesArrayObj: [mAddress] ,voutInfo: any): Promise<any> {
  const voutData: mVout = {
    value!: voutInfo.value,
    n: voutInfo.n,
    type: voutInfo.scriptPubKey.type,
    addresses: addressesArrayObj,
    transaction: transactionObj,
  };

  const newVout = transaction.create(mVout, voutData);
  return await transaction.save(newVout)
  .catch((error: any) => {
    debug.log(error);
  });
}

async function checkVoutAddresses (transaction: EntityManager, voutInfo: any): Promise<any> {
  const promiseAddressesArrayObj: mAddress[] = voutInfo.scriptPubKey.addresses.map(async (addressHash: string) => {
    const address = await transaction.findOne(mAddress, ({ address: addressHash }))
    if (address !== undefined) {
      await updateAddress(transaction, address, 1, new BigNumber(voutInfo.value), 0, new BigNumber(0))
      return address;
    } else {
      return await createAddress(transaction, addressHash, new BigNumber(voutInfo.value));
    }
  }, {concurrency: 1});
  return await Promise.all(promiseAddressesArrayObj);
}

async function createAddress (transaction: EntityManager, addressHash: string, inputBalance: BigNumber): Promise<any> {
  const addressData: mAddress = {
    address: addressHash,
    nTx: 1,
    balance: inputBalance.toNumber(),
    inputC: 1,
    outputC: 0,
  };

  const newAddress = transaction.create(mAddress, addressData);
  return await transaction.save(newAddress)
  .catch((error: any) => {
    debug.log(error);
  });
}

async function updateAddress (transaction: EntityManager, addressObj: mAddress, inputC: number, inputT: BigNumber, outputC: number, outputT: BigNumber): Promise<any> {
  addressObj.nTx += 1;
  addressObj.balance = inputC === 1 ? new BigNumber(addressObj.balance).plus(inputT).toNumber() : new BigNumber(addressObj.balance).minus(outputT).toNumber();
  addressObj.inputC += inputC;
  addressObj.outputC += outputC;

  return await transaction.update(mAddress, addressObj.id!, addressObj)
  .catch((error: any) => {
    debug.log(error);
  });
}