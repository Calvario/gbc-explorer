import debug from 'debug';
import fs from 'fs';
import { RPCClient } from 'rpc-bitcoin';
import { getRepository, getManager, EntityManager } from "typeorm";
import BigNumber from "bignumber.js"
import { mBlock, mTransaction, mAddress, mVin, mVout } from '@calvario/gbc-explorer-shared';

BigNumber.config({ DECIMAL_PLACES: 9 })

class Blockchain {

  private blockRepository = getRepository(mBlock);
  private addressRepository = getRepository(mAddress);

  public sync = async (rpcClient: RPCClient) => {
    const lastBlock = await rpcClient.getblockcount()
    .catch(error => {
      debug.log(error);
    });

    await this.blockRepository.findOneOrFail({
      select: ["height"],
      order: { height: 'DESC' }
    })
    .then(async (block: mBlock) => {
      await loop(rpcClient, Number(block.height) + 1, lastBlock);
    })
    .catch(async () => {
      await loop(rpcClient, 1, lastBlock);
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
          .then(async (address: mAddress | undefined) => {
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

  public checkChainTips = async (rpcClient: RPCClient) => {
    // Get the list of chains
    const chainTips = await rpcClient.getchaintips()
    .catch(error => {
      debug.log(error);
    });

    // Remove active chain block
    chainTips.shift();

    // Loop on each chain
    for(const chain of chainTips) {
      await manageSideChain(rpcClient, chain.hash, chain.status, chain.branchlen);
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
    await getAllFromBlockHash(rpc, blockHash);
    debug.log('-- END Heigh: ' + counter);
    // Jump to the next block
    counter++
  }
}

async function getAllFromBlockHash(rpc: RPCClient, blockHash: string) {
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
        // In case the transaction already exist because of side chain
        const getTransaction = await transactionalEntityManager.findOne(mTransaction, {
          where:{ txid: transactionInfo.txid}
        })
        .catch((error: any) => {
          debug.log(error);
        });

        // We update the transaction with the new blockId
        if (getTransaction !== undefined && blockObj.onMainChain === true) {
          getTransaction.block = blockObj;
          await transactionalEntityManager.save(getTransaction)
          .catch((error: any) => {
            debug.log(error);
          });

          blockInputC = blockInputC.plus(getTransaction.inputC!);
          blockInputT = blockInputT.plus(getTransaction.inputT!);
          blockOutputC = blockOutputC.plus(getTransaction.outputC!);
          blockOutputT = blockOutputT.plus(getTransaction.outputT!);
          blockFeesT = blockFeesT.plus(getTransaction.fee!);
        }
        // New transaction
        else {
          // 3. Create Transaction
          await createTransaction(transactionalEntityManager, blockObj, transactionInfo)
          .then( async (transactionObj: mTransaction) => {
            // Initialization of transaction update variable
            let tInputC: BigNumber = new BigNumber(0);
            let tInputT: BigNumber = new BigNumber(0);
            let tOutputC: BigNumber = new BigNumber(0);
            let tOutputT: BigNumber = new BigNumber(0);
            let tFee: BigNumber = new BigNumber(0);

            // 4. Loop for each VINs
            for(const vinInfo of transactionInfo.vin) {
              // 5. Check the VOUT transaction associated with the VIN
              await checkVinTransaction(blockObj.onMainChain ,transactionalEntityManager, vinInfo)
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
              // Discard nonstandard type
              if (voutInfo.scriptPubKey.type === 'nonstandard')  {
                continue;
              }

              // 8. Loop for each addresses and search them (or create them if needed) returning an array with ID's
              await checkVoutAddresses(blockObj.onMainChain, transactionalEntityManager, voutInfo)
              .then(async (addressesArrayObj: mAddress[]) => {
                // 9. Create VOUT
                await createVout(transactionalEntityManager, transactionObj, addressesArrayObj, voutInfo);

                // Update transation variables for output
                tOutputC = tOutputC.plus(1);
                tOutputT = tOutputT.plus(new BigNumber(voutInfo.value));

                // Block miner/validator depending of each coin type
                if (process.env.COIN_TYPE === 'PoST') {
                  if (blockInfo.flags === 'proof-of-stake' && blockInfo.tx[1].txid === transactionInfo.txid && transactionInfo.vout[0].scriptPubKey.type === 'nonstandard') {
                    blockMiner = addressesArrayObj[0];
                  } else if (blockInfo.flags === 'proof-of-stake stake-modifier' && blockInfo.tx[1].txid === transactionInfo.txid && transactionInfo.vout[0].scriptPubKey.type === 'nonstandard') {
                    blockMiner = addressesArrayObj[0];
                  } else if (blockInfo.flags === 'proof-of-work' && transactionInfo.vin[0].coinbase !== undefined && voutInfo.n === 0) {
                    blockMiner = addressesArrayObj[0];
                  } else if (blockInfo.flags === 'proof-of-work  stake-modifier' && transactionInfo.vin[0].coinbase !== undefined && voutInfo.n === 0) {
                    blockMiner = addressesArrayObj[0];
                  }
                } else if (process.env.COIN_TYPE === 'PoW') {
                  if (transactionInfo.vin[0].coinbase !== undefined && voutInfo.n === 0)
                    blockMiner = addressesArrayObj[0];
                }
              })
              .catch(error => {
                debug.log(error)
              })
            }

            // Block generation and transaction fee depending of each coin type
            if (process.env.COIN_TYPE === 'PoST') {
              if (blockInfo.flags === 'proof-of-stake' || blockInfo.flags === 'proof-of-stake stake-modifier') {
                if (blockInfo.tx[1].txid === transactionInfo.txid && transactionInfo.vout[0].scriptPubKey.type === 'nonstandard') {
                  blockGeneration = blockGeneration.plus(tOutputT.minus(tInputT));
                } else  {
                  tFee = tInputT.minus(tOutputT);
                  blockGeneration = blockGeneration.minus(tFee)
                }
              } else if (blockInfo.flags === 'proof-of-work' || blockInfo.flags === 'proof-of-work stake-modifier') {
                if (transactionInfo.vin[0].coinbase !== undefined) {
                  blockGeneration = blockGeneration.plus(tOutputT)
                } else  {
                  tFee = tInputT.minus(tOutputT)
                  blockGeneration = blockGeneration.minus(tFee);
                }
              }
            } else if (process.env.COIN_TYPE === 'PoW') {
              if (transactionInfo.vin[0].coinbase !== undefined) {
                blockGeneration = blockGeneration.plus(tOutputT)
              } else  {
                tFee = tInputT.minus(tOutputT)
                blockGeneration = blockGeneration.minus(tFee);
              }
            }

            // Update block variable
            blockOutputC = blockOutputC.plus(tOutputC);
            blockOutputT = blockOutputT.plus(tOutputT);
            blockFeesT = blockFeesT.plus(tFee);

            // 10. Update transaction
            await updateTransaction(transactionalEntityManager, transactionObj, tInputC.toNumber(), tInputT, tOutputC.toNumber(), tOutputT, tFee)
            .catch(error => {
              debug.log(error);
            })
          });
        }
      }

      // 11. Update block
      await updateBlock(transactionalEntityManager, blockObj, blockInputC.toNumber(), blockInputT, blockOutputC.toNumber(), blockOutputT, blockFeesT, blockMiner, blockGeneration)
      .catch(error => {
        debug.log(error);
      })
      .then(async () => {
        if(blockObj.height !== 1 && blockObj.onMainChain === true) {
          await updatePreviousBlock(transactionalEntityManager, blockObj);
        }
      });
    })
    .catch(error => {
      debug.log(error);
    })
  });
}

async function createBlock(transaction: EntityManager, blockInfo: any): Promise<any> {
  const blockData: mBlock = {
    hash: blockInfo.hash,
    onMainChain: (blockInfo.confirmation === -1 ? false : true),
    size: blockInfo.size,
    mint: blockInfo.mint,
    height: blockInfo.height,
    version: blockInfo.version,
    merkleroot: blockInfo.merkleroot,
    time: blockInfo.time,
    nonce: blockInfo.nonce,
    bits: blockInfo.bits,
    difficulty: blockInfo.difficulty,
    nTx: blockInfo.nTx !== undefined ? blockInfo.nTx : (blockInfo.tx as any[]).length,
    previousblockhash: blockInfo.previousblockhash,
    nextblockhash: blockInfo.nextblockhash,

    // PoW
    strippedsize: blockInfo.strippedsize,
    weight: blockInfo.weight,
    chainwork: blockInfo.chainwork,

    // PoS
    chaintrust: blockInfo.chaintrust,
    blocktrust: blockInfo.blocktrust,
    flags: blockInfo.flags,
    proofhash: blockInfo.proofhash,
    entropybit: blockInfo.entropybit,
    modifier: blockInfo.modifier,
    modifierchecksum: blockInfo.modifierchecksum,
    signature: blockInfo.signature,
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
  .then(async (previousBlockObj: mBlock) => {
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
    version: transactionInfo.version,
    time: transactionInfo.time,
    locktime: transactionInfo.locktime,
    block: blockObj,

    // PoW
    hash: transactionInfo.hash,
    size: transactionInfo.size,
    vsize: transactionInfo.vsize,
    weight: transactionInfo.weight,
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

async function checkVinTransaction (onMainChain: boolean, transaction: EntityManager, vinInfo: any): Promise<any> {
  if (vinInfo.txid !== undefined && vinInfo.vout !== undefined) {
    return await transaction.findOneOrFail(mTransaction, { txid: vinInfo.txid })
    .then(async (transactionObj: mTransaction) => {
      return await transaction.findOneOrFail(mVout, {
        where: {transaction: transactionObj.id, n: vinInfo.vout },
        relations: ["addresses"]
      });
    }).then(async (vout: mVout) => {
      if (onMainChain === true) {
        await updateAddress(transaction, vout.addresses[0], 0, new BigNumber(0), 1, new BigNumber(vout.value))
      }
      return vout;
    }).catch(error => {
      debug.log(error);
      return undefined;
    })
  } else {
    return undefined;
  }
}

async function createVout (transaction: EntityManager, transactionObj: mTransaction, addressesArrayObj: mAddress[] ,voutInfo: any): Promise<any> {
  const voutData: mVout = {
    value!: voutInfo.value,
    n: voutInfo.n,
    type: voutInfo.scriptPubKey.type,
    addresses: addressesArrayObj,
    transaction: transactionObj
  };

  const newVout = transaction.create(mVout, voutData);
  return await transaction.save(newVout)
  .catch((error: any) => {
    debug.log(error);
  });
}

async function checkVoutAddresses (onMainChain: boolean, transaction: EntityManager, voutInfo: any): Promise<any> {
  const promiseAddressesArrayObj: mAddress[] = voutInfo.scriptPubKey.addresses.map(async (addressHash: string) => {
    const address = await transaction.findOne(mAddress, ({ address: addressHash }))
    if (address !== undefined) {
      if (onMainChain === true) {
        await updateAddress(transaction, address, 1, new BigNumber(voutInfo.value), 0, new BigNumber(0))
      }
      return address;
    } else {
      return await createAddress(onMainChain, transaction, addressHash, new BigNumber(voutInfo.value));
    }
  }, {concurrency: 1});
  return await Promise.all(promiseAddressesArrayObj);
}

async function createAddress (onMainChain: boolean, transaction: EntityManager, addressHash: string, inputBalance: BigNumber): Promise<any> {
  const addressData: mAddress = {
    address: addressHash,
    nTx: onMainChain === true ? 1 : 0,
    balance: onMainChain === true ? inputBalance.toNumber() : 0,
    inputC: onMainChain === true ? 1 : 0,
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

async function manageSideChain (rpc: RPCClient, sideBlockHash: string, status: string, branchlen: number): Promise<any> {
  // Create a big transaction
  await getManager().transaction(async transactionalEntityManager => {
    let workingSideBlockHash = sideBlockHash;
    for (let i = 0; i < branchlen; i++) {
      // Find the block on the database
      const blockObj = await transactionalEntityManager.findOne(mBlock, {
        where: { hash : workingSideBlockHash }
      })
      .catch((error) => {
        debug.log(error);
      });

      // We have the side chain block on the database
      if (blockObj !== undefined) {
        // If we already managed it, we move the next one
        if (blockObj.onMainChain === false) {
          continue;
        }

        // Get the hash of the main chain block
        const mainBlockHash = await rpc.getblockhash({height: blockObj.height})
        .catch(error => {
          debug.log(error);
        });
        // Check if we have already inserted it
        await transactionalEntityManager.findOne(mBlock, {
          where: { hash : mainBlockHash }
        }).then(async (mainBlockObj: mBlock | undefined) => {
          if (mainBlockObj === undefined) {
            debug.log("Height : " + blockObj.height + " - Slide chain block detected (" + workingSideBlockHash +
              "), inserting block of main chain (" + mainBlockHash + ")");
            await getAllFromBlockHash(rpc, mainBlockHash);
          }
        })
        .then(async () => {
          // Update the side chain block as not on the mainchain
          blockObj.onMainChain = false;
          await transactionalEntityManager.update(mBlock, blockObj.id!, blockObj)
          .catch((error: any) => {
            debug.log(error);
          });

          // Update the addresses information
          await transactionalEntityManager.createQueryBuilder(mTransaction, "transaction")
          .innerJoin("transaction.block", "block")
          .innerJoinAndSelect("transaction.vins", "vin")
          .leftJoinAndSelect("vin.vout", "vinvout")
          .leftJoinAndSelect("vinvout.addresses", "vinaddress")
          .innerJoinAndSelect("transaction.vouts", "vout")
          .innerJoinAndSelect("vout.addresses", "address")
          .where("block.hash = :hash", { hash: workingSideBlockHash })
          .orderBy("transaction.id", "ASC")
          .addOrderBy("vin.id", "ASC")
          .addOrderBy("vout.n", "ASC")
          .getMany()
          .then(async (transactions: mTransaction[]) => {
            for (const transaction of transactions) {
              // Loop for each VIN
              for (const vin of transaction.vins!) {
                if (vin.coinbase === false && vin.vout !== undefined) {
                  await removeOnAddress(transactionalEntityManager, vin.vout.addresses[0], 0, new BigNumber(0), -1, new BigNumber(vin.vout.value));
                }
              }

              // Loop for each VOUT
              for (const vout of transaction.vouts!) {
                await removeOnAddress(transactionalEntityManager, vout.addresses[0], -1, new BigNumber(vout.value), 0, new BigNumber(0));
              }
            }
            workingSideBlockHash = blockObj.previousblockhash;
          })
          .catch((error) => {
            debug.log(error);
          });
        });
      }
      // Add the block for history (headers-only and invalid excluded)
      else if (status === 'valid-fork' || status === 'valid-headers') {
        const block = await rpc.getblock({blockhash: workingSideBlockHash, verbosity: 2})
        .then(async rpcBlock => {
          await getAllFromBlockHash(rpc, workingSideBlockHash);
          workingSideBlockHash = rpcBlock.previousblockhash;
        })
        .catch(error => {
          debug.log(error);
        });
      }
    }
  });
}

async function removeOnAddress(transaction: EntityManager, addressObj: mAddress, inputC: number, inputT: BigNumber, outputC: number, outputT: BigNumber): Promise<any> {
  addressObj.nTx -= 1;
  addressObj.balance = inputC === -1 ? new BigNumber(addressObj.balance).minus(inputT).toNumber() : new BigNumber(addressObj.balance).plus(outputT).toNumber();
  addressObj.inputC += inputC;
  addressObj.outputC += outputC;

  return await transaction.update(mAddress, addressObj.id!, addressObj)
  .catch((error: any) => {
    debug.log(error);
  });
}