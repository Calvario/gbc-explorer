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
import { getManager, EntityManager } from "typeorm";
import { mBlock, mChain, mChainStatus, mTransaction } from '@calvario/gbc-explorer-shared';
import { ChainStatus } from "./cChainStatus";
import { Block } from "./cBlock";
import { Transaction } from "./cTransaction";
import { Address, AddressDetails, UpdateType } from "./cAddress";

BigNumber.config({ DECIMAL_PLACES: 9 })

export class Chain {
  static async select(dbTransaction: EntityManager, chainHash: string): Promise<mChain | undefined> {
    return await dbTransaction.findOne(mChain, {
      where: { hash: chainHash }
    })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async selectVanished(dbTransaction: EntityManager): Promise<mChain[] | undefined> {
    return await dbTransaction.find(mChain, {
      join: {
        alias: "chain",
        leftJoinAndSelect: {
          block: "chain.blocks",
        }
      },
      where: { available: false, unknown: false},
      order: { "height": "DESC" }
    })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async selectMain(dbTransaction: EntityManager): Promise<mChain> {
    return await dbTransaction.findOne(mChain, {
      where: { id: 1 }
    })
      .then(async (chainObj: mChain | undefined) => {
        // We create a dummy main chain for the first sync
        if (chainObj === undefined) {
          const chainStatusObj: mChainStatus = await ChainStatus.select(dbTransaction, 'active')
            .catch((error) => {
              return Promise.reject(error);
            });
          const chainInfo = {
            height: 0,
            hash: '',
            branchlen: 0,
          };
          return await this.create(dbTransaction, chainInfo, chainStatusObj)
            .catch((error) => {
              return Promise.reject(error);
            });
        }
        // Return the main chain if it's on the database
        return chainObj;
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async create(dbTransaction: EntityManager, chainInfo: any, chainStatus: mChainStatus): Promise<mChain> {
    const chainData: mChain = {
      height: chainInfo.height,
      hash: chainInfo.hash,
      branchlen: chainInfo.branchlen,
      status: chainStatus,
      available: true,
      unknown: false,
    };

    const newChain = dbTransaction.create(mChain, chainData);
    return await dbTransaction.save(newChain)
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async update(dbTransaction: EntityManager, dbChain: mChain, chainInfo: any, chainStatus: mChainStatus): Promise<boolean> {
    return await dbTransaction.update(mChain, dbChain.id!, {
      height: chainInfo.height,
      hash: chainInfo.hash,
      branchlen: chainInfo.branchlen,
      status: chainStatus,
      available: true,
      unknown: false,
    })
      .then(() => {
        return true;
      })
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async updateToUnknown(dbTransaction: EntityManager, dbChain: mChain): Promise<boolean> {
    return await dbTransaction.update(mChain, dbChain.id!, {
      unknown: true,
    })
      .then(() => {
        return true;
      })
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async updateAllToUnavailable(dbTransaction: EntityManager): Promise<boolean> {
    return await dbTransaction.createQueryBuilder()
      .update(mChain)
      .set({ available: false })
      .where('available = true')
      .execute()
      .then(() => {
        return true;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static async delete(dbTransaction: EntityManager, dbChain: mChain): Promise<boolean> {
    return await dbTransaction.delete(mChain, dbChain.id!)
      .then(() => {
        return true;
      })
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async sync(rpcClient: RPCClient) {
    // Get the list of chains
    const chainTips = await rpcClient.getchaintips()
      .catch(error => {
        return Promise.reject(error);
      });

    // Create a big transaction
    await getManager().transaction(async dbTransaction => {

      // Start fresh to find removed
      await this.updateAllToUnavailable(dbTransaction)
        .catch(error => {
          return Promise.reject(error);
        });

      // Loop on each chain
      for (const chain of chainTips) {

        // Search the chain status
        const chainStatus = await ChainStatus.select(dbTransaction, chain.status)
          .catch(error => {
            return Promise.reject(error);
          });

        // Update active chain information
        if (chain.status === 'active' && chain.branchlen === 0) {
          await this.selectMain(dbTransaction)
            .then((chainObj: mChain) => {
              this.update(dbTransaction, chainObj, chain, chainStatus)
            })
            .catch(error => {
              return Promise.reject(error);
            });
        }
        // Side chain management
        else {
          // Search the chain hash on the database
          await this.select(dbTransaction, chain.hash)
            .then(async (chainObj: mChain | undefined) => {
              // Chain was found
              if (chainObj !== undefined) {
                this.update(dbTransaction, chainObj, chain, chainStatus)
                return chainObj;
              }
              // Chain hash not found but lenght of 1
              else if (chain.branchlen === 1) {
                return await this.create(dbTransaction, chain, chainStatus);
              }
              // Search until we find the associated chain
              else if (chain.status === 'valid-fork' || chain.status === 'valid-headers') {
                let searchChainObj: mChain | undefined;
                let searchHash = chain.hash;
                for (let i = 0; i < chain.branchlen; i++) {
                  const loopChainObj = await this.select(dbTransaction, searchHash);
                  if (loopChainObj === undefined) {
                    const blockObj = await rpcClient.getblock({
                      blockhash: searchHash,
                      verbosity: 2
                    })
                    searchHash = blockObj.previousblockhash;
                  } else {
                    searchChainObj = loopChainObj
                    break;
                  }
                }
                // No match, we insert it
                if (searchChainObj === undefined) {
                  return await this.create(dbTransaction, chain, chainStatus);
                }
                // We find it and update it
                else {
                  await this.update(dbTransaction, searchChainObj, chain, chainStatus)
                  return searchChainObj;
                }
              }
              // It's a dummy chain
              else {
                return await this.create(dbTransaction, chain, chainStatus);
              }
            })
            .then(async (chainObj: mChain) => {
              return await manageSideChain(dbTransaction, rpcClient, chain, chainObj)
            })
            .catch(error => {
              return Promise.reject(error);
            });
        }
      }

      // Get the list of all chains that disappeared from the export
      await this.selectVanished(dbTransaction)
        .then(async (chainsListObj: mChain[] | undefined) => {
          // If we have some chains to manage
          if (chainsListObj !== undefined) {
            // Get the main chain
            const mainChainObj = await this.selectMain(dbTransaction)
              .catch(error => {
                return Promise.reject(error);
              });

            // Loop on each chain
            for (const chainObj of chainsListObj) {
              let toRemove = true;
              if (chainObj.blocks !== undefined) {
                // Loop on each block of the chain
                for (const dbBlock of chainObj.blocks) {
                  const mainHash = await rpcClient.getBlockHashByHeight({
                    height: dbBlock.height
                  })
                    .catch(error => {
                      return Promise.reject(error);
                    });

                  if (mainHash === dbBlock.hash) {
                    debug.log('Moving block to main chain: ' + dbBlock.hash);
                    await Block.updateChain(dbTransaction, dbBlock, mainChainObj)
                      .catch(error => {
                        return Promise.reject(error);
                      });
                    await Address.updateForBlock(dbTransaction, dbBlock)
                      .catch(error => {
                        return Promise.reject(error);
                      });
                  }
                  // Side chain chaos situation
                  else {
                    debug.log('Unknow chain detected: ' + chainObj.hash);
                    await this.updateToUnknown(dbTransaction, chainObj)
                      .catch(error => {
                        return Promise.reject(error);
                      });
                    toRemove = false;
                  }
                }
              }

              // We only remove the chain that we fully migrated
              if (toRemove === true) {
                debug.log('Removing bad detected chain: ' + chainObj.hash);
                await Chain.delete(dbTransaction, chainObj)
                  .catch(error => {
                    return Promise.reject(error);
                  });
              }
            }
          }
        });
    });
  }
}

async function manageSideChain(dbTransaction: EntityManager, rpc: RPCClient, chainInfo: any, chainObj: mChain): Promise<any> {
  // Define current block hash
  let workingSideBlockHash = chainInfo.hash;

  // Loop all the brench lenght
  for (let i = 0; i < chainInfo.branchlen; i++) {

    // Find the block on the database
    const blockObj = await Block.select(dbTransaction, workingSideBlockHash)
      .catch(error => {
        return Promise.reject(error);
      });

    // Add the block for history (headers-only and invalid excluded)
    if (blockObj === undefined && (chainInfo.status === 'valid-fork' || chainInfo.status === 'valid-headers')) {
      await rpc.getblock({ blockhash: workingSideBlockHash, verbosity: 2 })
        .then(async rpcBlock => {
          await Block.addFromHash(dbTransaction, rpc, workingSideBlockHash, chainObj);
          return rpcBlock.previousblockhash
        })
        .then((previousblockhash: string) => {
          workingSideBlockHash = previousblockhash;
        })
        .catch(error => {
          return Promise.reject(error);
        });
    }
    // We have the side chain block on the database
    else if (blockObj !== undefined) {

      // If we already managed it, we move the next one
      if (blockObj.chain.id !== 1) {
        continue;
      }

      // Get the hash of the main chain block
      const mainBlockHash = await rpc.getblockhash({ height: blockObj.height })
        .catch(error => {
          return Promise.reject(error);
        });

      // In case it's a info gap and it is really on the mainchain
      if (blockObj.hash === mainBlockHash) {
        debug.log('Removed chain: ' + chainObj.hash + ', chainStatus: ' + chainObj.status.name)
        await Chain.delete(dbTransaction, chainObj)
      }

      // Try to find the main chain block hash on the database
      const mainBlockObj = await dbTransaction.findOne(mBlock, {
        where: { hash: mainBlockHash }
      })
        .catch(error => {
          return Promise.reject(error);
        });

      // If we don't have the main chain block on the database
      if (mainBlockObj === undefined) {

        // Some log info
        debug.log("Height : " + blockObj.height + " - Slide chain block detected (" + workingSideBlockHash + ")");
        debug.log("Inserting block of main chain (" + mainBlockHash + ")");

        await Chain.selectMain(dbTransaction)
          .then(async (mainChainObj: mChain) => {
            return await Block.addFromHash(dbTransaction, rpc, mainBlockHash, mainChainObj)
          })
          .catch(error => {
            return Promise.reject(error);
          });
      }

      // Change the "old" block to the the new side chain
      await Block.updateChain(dbTransaction, blockObj, chainObj)
        .catch(error => {
          return Promise.reject(error);
        });

      // Update the addresses information
      await Transaction.select(dbTransaction, workingSideBlockHash)
        .then(async (transactions: mTransaction[]) => {
          // Loop for each transaction
          for (const transaction of transactions) {
            if (transaction.vins !== undefined) {
              // Loop for each VIN
              for (const vin of transaction.vins) {
                if (vin.coinbase === false && vin.vout !== undefined) {
                  const addressDetails: AddressDetails = {
                    type: UpdateType.SUBTRACTION,
                    inputC: 0,
                    inputT: new BigNumber(0),
                    outputC: 1,
                    outputT: new BigNumber(vin.vout.value)
                  }
                  await Address.update(dbTransaction, vin.vout.addresses![0], addressDetails)
                    .catch(error => {
                      return Promise.reject(error);
                    });
                }
              }
            }

            if (transaction.vouts !== undefined) {
              // Loop for each VOUT
              for (const vout of transaction.vouts) {
                const addressDetails: AddressDetails = {
                  type: UpdateType.SUBTRACTION,
                  inputC: 1,
                  inputT: new BigNumber(vout.value),
                  outputC: 0,
                  outputT: new BigNumber(0)
                }
                if (vout.addresses !== undefined) {
                  await Address.update(dbTransaction, vout.addresses[0], addressDetails)
                    .catch(error => {
                      return Promise.reject(error);
                    });
                }
              }
            }
          }
        })
        .then(() => {
          workingSideBlockHash = blockObj.previousblockhash;
        })
        .catch(error => {
          return Promise.reject(error);
        });
    }
  }
}