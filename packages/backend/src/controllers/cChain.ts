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
import { getManager, EntityManager, Not } from "typeorm";
import { mChain, mChainStatus } from '@calvario/gbc-explorer-shared';
import { ChainStatus } from "./cChainStatus";
import { Block } from "./cBlock";
import { Address } from "./cAddress";

BigNumber.config({ DECIMAL_PLACES: 9 })

export class Chain {
  static async select(dbTransaction: EntityManager, chainHash: string): Promise<mChain | undefined> {
    return dbTransaction.findOne(mChain, {
      where: { hash: chainHash }
    })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async selectMain(dbTransaction: EntityManager): Promise<mChain> {
    return dbTransaction.findOne(mChain, {
      where: { id: 1 } // HARDCODED MAIN CHAIN ID
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
          return this.create(dbTransaction, chainInfo, chainStatusObj)
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

  static async selectAll(dbTransaction: EntityManager): Promise<mChain[]> {
    return dbTransaction.find(mChain, {
      join: {
        alias: "chain",
        innerJoinAndSelect: {
          ChainStatus: "chain.status",
        }
      },
      where: { id: Not(1) } // HARDCODED MAIN CHAIN ID
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
    };

    const newChain = dbTransaction.create(mChain, chainData);
    return dbTransaction.save(newChain)
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async createUnknown(dbTransaction: EntityManager, height: number, hash: string): Promise<mChain> {
    const chainStatusObj: mChainStatus = await ChainStatus.select(dbTransaction, 'Unknown')
      .catch((error) => {
        return Promise.reject(error);
      });

    const chainData: mChain = {
      height: height,
      hash: hash,
      branchlen: 1,
      status: chainStatusObj,
    };

    const newChain = dbTransaction.create(mChain, chainData);
    return dbTransaction.save(newChain)
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async update(dbTransaction: EntityManager, dbChain: mChain, chainInfo: any, chainStatus: mChainStatus): Promise<boolean> {
    return dbTransaction.update(mChain, dbChain.id!, {
      height: chainInfo.height,
      hash: chainInfo.hash,
      branchlen: chainInfo.branchlen,
      status: chainStatus,
    })
      .then(() => {
        return true;
      })
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async delete(dbTransaction: EntityManager, dbChain: mChain): Promise<boolean> {
    return dbTransaction.delete(mChain, dbChain.id!)
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

      // Get the main chain
      let mainChainObj = await this.selectMain(dbTransaction)
        .catch(error => {
          return Promise.reject(error);
        });

      // Update the main chain
      const activeChainTip = chainTips.find((chainTip: any) => chainTip.status === 'active');
      this.update(dbTransaction, mainChainObj, activeChainTip, mainChainObj.status)
        .then(async () =>
          mainChainObj = await this.selectMain(dbTransaction)
        )
        .catch(error => {
          return Promise.reject(error);
        });

      // Get all the chains in the DB
      let dbChains = await this.selectAll(dbTransaction)
        .catch(error => {
          return Promise.reject(error);
        });

      // Get the missing chain tips
      const missingChainTips = chainTips.filter((chainTip: any) =>
        !dbChains.some(dbChain => (
          chainTip.hash === dbChain.hash ||
          chainTip.status === 'active'
        ))
      );

      if (missingChainTips.lenght >= 1) {
        // Loop on each chain
        for (const missingChainTip of missingChainTips) {

          // Search the chain status
          await ChainStatus.select(dbTransaction, missingChainTip.status)
            .then(async (chainStatus: mChainStatus) => {
              if (missingChainTip.branchlen > 1 && (missingChainTip.status === 'valid-fork' || missingChainTip.status === 'valid-headers')) {
                let searchChainObj: mChain | undefined;
                let searchHash = missingChainTip.hash;
                for (let i = 0; i < missingChainTip.branchlen; i++) {
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
                  return this.create(dbTransaction, missingChainTip, chainStatus);
                }
                // We found it and update it
                else {
                  await this.update(dbTransaction, searchChainObj, missingChainTip, chainStatus)
                  return searchChainObj;
                }
              }
              else {
                return this.create(dbTransaction, missingChainTip, chainStatus);
              }
            })
            .then(async (chainObj: mChain) => {
              return manageSideChain(dbTransaction, rpcClient, missingChainTip, chainObj)
            })
            .catch(error => {
              return Promise.reject(error);
            });
        }

        // Renewed get of all the chains in the DB
        dbChains = await this.selectAll(dbTransaction)
          .catch(error => {
            return Promise.reject(error);
          });
      }

      // Get the removed chain tips
      const removedChains = dbChains.filter(dbChain =>
        !chainTips!.some((chainTip: any) => (
          chainTip.hash === dbChain.hash
        ))
      );

      // Manage the removed chain tips
      if (removedChains.length >= 1) {
        // Loop on each chain
        for (const removedChain of removedChains) {
          let toRemove = true;
          if (removedChain.blocks !== undefined) {
            // Loop on each block of the chain
            for (const dbBlock of removedChain.blocks) {
              const mainHash = await rpcClient.getblockhash({
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
                await Address.updateForBlock(dbTransaction, dbBlock, true)
                  .catch(error => {
                    return Promise.reject(error);
                  });
              }
              // Side chain chaos situation
              else {
                return Promise.reject('Unknow chain detected: ' + removedChain.hash);
              }
            }
          }

          // We only remove the chain that we fully migrated
          if (toRemove === true) {
            debug.log('Removing migrated chain: ' + removedChain.hash);
            await Chain.delete(dbTransaction, removedChain)
              .catch(error => {
                return Promise.reject(error);
              });
          }
        }

        // Renewed get of all the chains in the DB
        dbChains = await this.selectAll(dbTransaction)
          .catch(error => {
            return Promise.reject(error);
          });
      }

      // Get the changed chain tips (Not sure if possible)
      const changedChainTips = chainTips.filter((chainTip: any) =>
        dbChains.some(dbChain => (
          chainTip.hash === dbChain.hash &&
          (
            chainTip.status != dbChain.status.name ||
            chainTip.branchlen != dbChain.branchlen ||
            chainTip.height != dbChain.height
          )
        ))
      );

      // Manage the changed chain tips
      if (changedChainTips.length >= 1) {
        // Loop on each chain
        for (const chainTip of changedChainTips) {
          // Search the chain status
          const chainStatus = await ChainStatus.select(dbTransaction, chainTip.status)
            .catch(error => {
              return Promise.reject(error);
            });

          // Search the chain hash on the database
          await this.select(dbTransaction, chainTip.hash)
            .then(async (chainObj: mChain | undefined) => {
              // Update the chain
              this.update(dbTransaction, chainObj!, chainTip, chainStatus);
            })
            .catch(error => {
              return Promise.reject(error);
            });
        }
      }
    });
  }
}

async function manageSideChain(dbTransaction: EntityManager, rpcClient: RPCClient, chainInfo: any, chainObj: mChain): Promise<any> {
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
      await rpcClient.getblock({ blockhash: workingSideBlockHash, verbosity: 2 })
        .then(async rpcBlock => {
          await Block.addFromHash(dbTransaction, rpcClient, workingSideBlockHash, chainObj);
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
      const mainBlockHash = await rpcClient.getblockhash({ height: blockObj.height })
        .catch(error => {
          return Promise.reject(error);
        });

      // In case it's a info gap and it is really on the mainchain
      if (blockObj.hash === mainBlockHash) {
        debug.log('Removed chain: ' + chainObj.hash + ', chainStatus: ' + chainObj.status.name)
        await Chain.delete(dbTransaction, chainObj)
      }

      await Block.resyncToMainChain(dbTransaction, rpcClient, blockObj.height, mainBlockHash, blockObj, chainObj)
        .catch(error => {
          return Promise.reject(error);
        });
    }
  }
}