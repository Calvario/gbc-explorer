/**
 * Copyright (C) 2020 Steve Calvário
 *
 * This file is part of GBC Explorer, a web multi-coin blockchain explorer.
 *
 * GBC Explorer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * GBC Explorer is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * GBC Explorer. If not, see <https://www.gnu.org/licenses/>.
 */

import debug from "debug";
import BigNumber from "bignumber.js"
import { RPCClient } from "rpc-bitcoin";
import { getManager, EntityManager, getRepository, UpdateResult } from "typeorm";
import { mBlock, mAddress, mTransaction, mChain, mVout } from '@calvario/gbc-explorer-shared';
import { Chain } from "./cChain";
import { Transaction, UpdatedTransaction } from "./cTransaction";
import { Vin } from "./cVin";
import { Vout } from "./cVout";
import { Address, AddressDetails, UpdateType } from "./cAddress";


BigNumber.config({ DECIMAL_PLACES: 9 })

export class Block {

  static async select(dbTransaction: EntityManager, blockHash: string): Promise<mBlock | undefined> {
    return await dbTransaction.findOne(mBlock, {
      join: {
        alias: "block",
        innerJoinAndSelect: {
          chain: "block.chain",
        }
      },
      where: { hash: blockHash }
    })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static async create(dbTransaction: EntityManager, blockInfo: any, chainObj: mChain): Promise<mBlock> {
    const blockData: mBlock = {
      hash: blockInfo.hash,
      chain: chainObj,
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

    const newBlock = dbTransaction.create(mBlock, blockData);
    return await dbTransaction.save(newBlock)
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static async update(dbTransaction: EntityManager, blockObj: mBlock, updatedBlock: UpdatedBlock): Promise<UpdateResult> {
    return await dbTransaction.update(mBlock, blockObj.id!, {
      inputC: updatedBlock.bInputC,
      inputT: updatedBlock.bInputT.toNumber(),
      outputC: updatedBlock.bOutputC,
      outputT: updatedBlock.bOutputT.toNumber(),
      feesT: updatedBlock.bFeesT.toNumber(),
      miner: updatedBlock.bMiner,
      generation: updatedBlock.bGeneration.toNumber(),
    })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static async updatePreviousBlockHash(dbTransaction: EntityManager, blockObj: mBlock): Promise<UpdateResult> {
    const previousBlockObj = await dbTransaction.findOneOrFail(mBlock, { hash: blockObj.previousblockhash })
      .catch(error => {
        return Promise.reject(error);
      })

    return await dbTransaction.update(mBlock, previousBlockObj.id!, { nextblockhash: blockObj.hash })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static async updateChain(dbTransaction: EntityManager, blockObj: mBlock, chainObj: mChain): Promise<UpdateResult> {
    return await dbTransaction.update(mBlock, blockObj.id!, { chain: chainObj })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static async sync(rpcClient: RPCClient) {
    const lastBlock = await rpcClient.getblockcount()
      .catch(error => {
        return Promise.reject(error);
      });

    const currentBlock = await getRepository(mBlock).findOne({
      select: ["height"],
      where: { chain: 1 },
      order: { height: 'DESC' }
    })
      .catch(error => {
        return Promise.reject(error);
      });

    let counter: number = currentBlock === undefined ? 1 : currentBlock.height + 1;

    while (counter <= lastBlock) {
      debug.log('-- START Heigh: ' + counter);
      await rpcClient.getblockhash({ height: counter })
        .then(async (blockHash: string) => {
          // Create a big transaction
          await getManager().transaction(async dbTransaction => {
            await Chain.selectMain(dbTransaction)
              .then(async (chain: mChain) => {
                // Search if a block exist with this hash
                const dbBlock = await Block.select(dbTransaction, blockHash)
                  .catch(error => {
                    return Promise.reject(error);
                  });

                if (dbBlock === undefined) {
                  await this.addFromHash(dbTransaction, rpcClient, blockHash, chain)
                    .catch(error => {
                      return Promise.reject(error);
                    });
                }
              })
              .catch(error => {
                return Promise.reject(error);
              });
          });
        })
        .then(() => {
          debug.log('-- END Heigh: ' + counter);
          // Jump to the next block
          counter++
        })
        .catch(error => {
          return Promise.reject(error);
        });
    }
  }

  static async addFromHash(dbTransaction: EntityManager, rpc: RPCClient, blockHash: string, chainObj: mChain) {
    const blockInfo = await rpc.getblock({ blockhash: blockHash, verbosity: 2 })
      .catch(error => {
        return Promise.reject(error);
      });

    // 1. Create block
    await Block.create(dbTransaction, blockInfo, chainObj)
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
        for (const transactionInfo of blockInfo.tx) {
          // In case the transaction already exist because of side chain
          const transactionObj = await dbTransaction.findOne(mTransaction, {
            where: { txid: transactionInfo.txid }
          })
            .catch((error: any) => {
              return Promise.reject(error);
            });

          // We update the transaction with the new blockId
          if (transactionObj !== undefined) {
            await Transaction.updateLinkedBlock(dbTransaction, transactionObj, blockObj)
              .catch((error: any) => {
                return Promise.reject(error);
              });

            blockInputC = blockInputC.plus(transactionObj.inputC!);
            blockInputT = blockInputT.plus(transactionObj.inputT!);
            blockOutputC = blockOutputC.plus(transactionObj.outputC!);
            blockOutputT = blockOutputT.plus(transactionObj.outputT!);
            blockFeesT = blockFeesT.plus(transactionObj.fee!);
          }
          // New transaction
          else {
            // 3. Create Transaction
            await Transaction.create(dbTransaction, blockObj, transactionInfo)
              .then(async (newTransactionObj: mTransaction) => {
                // Initialization of transaction update variable
                let tInputC: BigNumber = new BigNumber(0);
                let tInputT: BigNumber = new BigNumber(0);
                let tOutputC: BigNumber = new BigNumber(0);
                let tOutputT: BigNumber = new BigNumber(0);
                let tFee: BigNumber = new BigNumber(0);

                // 4. Loop for each VINs
                for (const vinInfo of transactionInfo.vin) {
                  // 5. Check the VOUT transaction associated with the VIN
                  const voutVin: mVout | undefined = await Vout.getVoutForVin(dbTransaction, vinInfo)
                    .catch(error => {
                      return Promise.reject(error);
                    });

                  // 6. Create VIN
                  await Vin.create(dbTransaction, newTransactionObj, vinInfo, voutVin)
                    .catch(error => {
                      return Promise.reject(error);
                    });

                  if (voutVin !== undefined && voutVin.addresses !== undefined && blockObj.chain.id === 1) {
                    const addressDetails: AddressDetails = {
                      type: UpdateType.ADDITION,
                      inputC: 0,
                      inputT: new BigNumber(0),
                      outputC: 1,
                      outputT: new BigNumber(voutVin.value)
                    }

                    await Address.update(dbTransaction, voutVin.addresses[0], addressDetails)
                      .catch(error => {
                        return Promise.reject(error);
                      });
                  }
                  // Update transation and block variables for output
                  tInputC = tInputC.plus(1);
                  tInputT = voutVin === undefined ? new BigNumber(0) : tInputT.plus(new BigNumber(voutVin.value));
                }
                blockInputC = blockInputC.plus(tInputC);
                blockInputT = blockInputT.plus(tInputT);

                // 7. Loop for each VOUTs
                for (const voutInfo of transactionInfo.vout) {
                  // Discard nonstandard or nulldata type
                  if (voutInfo.scriptPubKey.type === 'nonstandard' || voutInfo.scriptPubKey.type === 'nulldata') {
                    continue;
                  }

                  // 8. Loop for each addresses and search them (or create them if needed) returning an array with ID's
                  await Vout.checkVoutAddresses(dbTransaction, blockObj.chain.id, voutInfo)
                    .then(async (addressesArrayObj: mAddress[]) => {
                      // 9. Create VOUT
                      await Vout.create(dbTransaction, newTransactionObj, addressesArrayObj, undefined, voutInfo)
                        .catch(error => {
                          return Promise.reject(error);
                        });

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
                      return Promise.reject(error);
                    });
                }

                // Block generation and transaction fee depending of each coin type
                if (process.env.COIN_TYPE === 'PoST') {
                  if (blockInfo.flags === 'proof-of-stake' || blockInfo.flags === 'proof-of-stake stake-modifier') {
                    if (blockInfo.tx[1].txid === transactionInfo.txid && transactionInfo.vout[0].scriptPubKey.type === 'nonstandard') {
                      blockGeneration = blockGeneration.plus(tOutputT.minus(tInputT));
                    } else {
                      tFee = tInputT.minus(tOutputT);
                      blockGeneration = blockGeneration.minus(tFee)
                    }
                  } else if (blockInfo.flags === 'proof-of-work' || blockInfo.flags === 'proof-of-work stake-modifier') {
                    if (transactionInfo.vin[0].coinbase !== undefined) {
                      blockGeneration = blockGeneration.plus(tOutputT)
                    } else {
                      tFee = tInputT.minus(tOutputT)
                      blockGeneration = blockGeneration.minus(tFee);
                    }
                  }
                } else if (process.env.COIN_TYPE === 'PoW') {
                  if (transactionInfo.vin[0].coinbase !== undefined) {
                    blockGeneration = blockGeneration.plus(tOutputT)
                  } else {
                    tFee = tInputT.minus(tOutputT)
                    blockGeneration = blockGeneration.minus(tFee);
                  }
                }

                // Update block variable
                blockOutputC = blockOutputC.plus(tOutputC);
                blockOutputT = blockOutputT.plus(tOutputT);
                blockFeesT = blockFeesT.plus(tFee);

                // 10. Update transaction
                const updatedTransaction: UpdatedTransaction = {
                  tInputC: tInputC.toNumber(),
                  tInputT,
                  tOutputC: tOutputC.toNumber(),
                  tOutputT,
                  tFee
                }
                await Transaction.update(dbTransaction, newTransactionObj, updatedTransaction)
                  .catch(error => {
                    return Promise.reject(error);
                  })
              })
              .catch(error => {
                return Promise.reject(error);
              });
          }
        }

        // 11. Update block
        const updatedBlock: UpdatedBlock = {
          bInputC: blockInputC.toNumber(),
          bInputT: blockInputT,
          bOutputC: blockOutputC.toNumber(),
          bOutputT: blockOutputT,
          bFeesT: blockFeesT,
          bMiner: blockMiner,
          bGeneration: blockGeneration
        }
        await Block.update(dbTransaction, blockObj, updatedBlock)
          .then(async () => {
            if (blockObj.height !== 1 && blockObj.chain.id === 1) {
              await Block.updatePreviousBlockHash(dbTransaction, blockObj);
            }
          })
          .catch(error => {
            return Promise.reject(error);
          });
      })
      .catch(error => {
        return Promise.reject(error);
      })
  }
}

export interface UpdatedBlock {
  bInputC: number,
  bInputT: BigNumber,
  bOutputC: number,
  bOutputT: BigNumber,
  bFeesT: BigNumber,
  bMiner: mAddress | undefined,
  bGeneration: BigNumber
}