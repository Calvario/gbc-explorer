import axios from 'axios';
import { RPCClient } from "rpc-bitcoin";
import { getManager, EntityManager } from "typeorm";
import { mPeer, mPeerVersion, mCountry } from '@calvario/gbc-explorer-shared';
import { PeerVersion } from './cPeerVersion'
import { Country } from './cCountry'

export class Peer {
  static async select(dbTransaction: EntityManager, peerIP: string): Promise<mPeer | undefined> {
    return await dbTransaction.findOne(mPeer, {
      where: { ip: peerIP }
    })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async create(dbTransaction: EntityManager, peerIP: string, peerPort: number | undefined, dbPeerVersion: mPeerVersion, dbCountry: mCountry): Promise<mPeer> {
    const peerData: mPeer = {
      ip: peerIP,
      port: peerPort,
      version: dbPeerVersion,
      country: dbCountry,
      connected: true,
    };

    const newPeer = dbTransaction.create(mPeer, peerData);
    return await dbTransaction.save(newPeer)
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async update(dbTransaction: EntityManager, dbPeer: mPeer, peerPort: number | undefined, dbPeerVersion: mPeerVersion): Promise<boolean> {
    return await dbTransaction.update(mPeer, dbPeer.id!, {
      port: peerPort,
      version: dbPeerVersion,
      connected: true,
    })
      .then(() => {
        return true;
      })
      .catch((error: any) => {
        return Promise.reject(error);
      });
  }

  static async updateAllToInactive(dbTransaction: EntityManager): Promise<boolean> {
    return await dbTransaction.createQueryBuilder()
      .update(mPeer)
      .set({ connected: false })
      .where("connected = true")
      .execute()
      .then(() => {
        return true;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static async sync(rpc: RPCClient) {
    rpc.getpeerinfo()
      .then(async peerInfo => {
        // Create a big transaction
        await getManager().transaction(async dbTransaction => {
          // We put all the peers to inactive to have a fresh count of active connections
          await Peer.updateAllToInactive(dbTransaction)
            .catch(error => {
              return Promise.reject(error);
            });
          // Loop on each peer
          for (const peer of peerInfo) {
            const peerIP = getPeerIP(peer.addr);
            const peerPort = getPeerPort(peer.addr);

            // Discard 0 version peers
            if (peer.version === 0 || peerIP === undefined) {
              continue;
            }

            const peerVersion = await PeerVersion.select(dbTransaction, peer.version, peer.subver)
              .catch(error => {
                return Promise.reject(error);
              });
            const dbPeer = await Peer.select(dbTransaction, peerIP)
              .catch(error => {
                return Promise.reject(error);
              });

            // Insert peer if it doesn't exist
            if (dbPeer === undefined) {
              const geoIP = await getPeerGeoIP(peerIP)
                .catch(error => {
                  return Promise.reject(error);
                });

              await Country.select(dbTransaction, geoIP.countryCode, geoIP.countryName)
                .then(async (peerCountry: mCountry) => {
                  await Peer.create(dbTransaction, peerIP, peerPort, peerVersion, peerCountry)
                })
                .catch(error => {
                  return Promise.reject(error);
                });
            }
            // Update existing peer
            else {
              await Peer.update(dbTransaction, dbPeer, peerPort, peerVersion)
                .catch(error => {
                  return Promise.reject(error);
                });
            }
          }
        })
      })
      .catch(error => {
        return Promise.reject(error)
      });
  }
}


function getPeerIP(addr: string): string | undefined {
  const regexIPv4 = addr.match(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/);

  if (regexIPv4) {
    return regexIPv4[0];
  } else {
    return undefined;
  }
}

function getPeerPort(addr: string): number | undefined {
  const regexPort = addr.match('((?::))(?:[0-9]+)$');
  if (regexPort) {
    return Number(regexPort[0].substring(1));
  } else {
    return undefined;
  }
}

async function getPeerGeoIP(ip: string): Promise<{ countryCode: string, countryName: string }> {
  return await axios.get('https://get.geojs.io/v1/ip/country/' + ip + '.json')
    .then(response => {
      // Return ISO code (2 letters)
      return { countryCode: String(response.data.country), countryName: String(response.data.name) };
    })
    .catch(error => {
      return Promise.reject(error);
    });
}