import debug from 'debug';
import axios from 'axios';
import { RPCClient } from "rpc-bitcoin";
import { getManager, EntityManager } from "typeorm";
import { mCountry, mPeerVersion, mPeer } from '@calvario/gbc-explorer-shared';

export default function sync(rpc: RPCClient) {
  rpc.getpeerinfo()
  .then(async peerInfo => {
    // Create a big transaction
    await getManager().transaction(async transactionalEntityManager => {
      // We put all the peers to inactive to have a fresh count of active connections
      await updateAllPeersToInactive(transactionalEntityManager);
      // Loop on each peer
      for (const peer of peerInfo) {
        // Discard 0 version peers
        if(peer.version === 0) {
          continue;
        }
        const peerIP = getPeerIP(peer.addr);
        const peerPort = getPeerPort(peer.addr);
        if (peerIP === undefined) {
          continue;
        }
        const peerVersion = await selectPeerVersion(transactionalEntityManager, peer.version, peer.subver);
        if (peerVersion === undefined) {
          continue;
        }

        const dbPeer = await selectPeer(transactionalEntityManager, peerIP);
        // Insert peer if it doesn't exist
        if(dbPeer === undefined) {
          const geoIP = await getPeerGeoIP(peerIP);
          if (geoIP === undefined) {
            continue;
          }

          const peerCountry = await selectCountry(transactionalEntityManager, geoIP.countryCode, geoIP.countryName)
          if (peerCountry === undefined) {
            continue;
          }

          await insertPeer(transactionalEntityManager, peerIP, peerPort, peerVersion, peerCountry);
        }
        // Update existing peer
        else {
          await updatePeer(transactionalEntityManager, dbPeer, peerPort, peerVersion);
        }
      }
    });
  })
  .catch(error => {
    debug.log(error);
  });
}

async function selectCountry(dbTransaction: EntityManager, countryCode: string, countryName: string): Promise<mCountry | undefined> {
  return await dbTransaction.findOne(mCountry, {
    where: { code : countryCode }
  })
  .then(async dbCountry => {
    if (dbCountry === undefined)
      return await insertCountry(dbTransaction, countryCode, countryName);
    else
      return dbCountry;
  })
  .catch((error) => {
    debug.log(error);
    return undefined;
  });
}

async function insertCountry(dbTransaction: EntityManager, countryCode: string, countryName: string): Promise<mCountry | undefined> {
  const countryData: mCountry = {
    code: countryCode,
    name: countryName,
  };

  const newCountry = dbTransaction.create(mCountry, countryData);
  return await dbTransaction.save(newCountry)
  .catch((error) => {
    debug.log(error);
    return undefined;
  });
}

async function selectPeerVersion(dbTransaction: EntityManager, peerVersion: number, peerSubVersion: string): Promise<mPeerVersion | undefined> {
  return await dbTransaction.findOne(mPeerVersion, {
    where: { version : peerVersion, subVersion: peerSubVersion }
  })
  .then(async dbPeerVersion => {
    if (dbPeerVersion === undefined)
      return await insertPeerVersion(dbTransaction, peerVersion, peerSubVersion);
    else
      return dbPeerVersion;
  })
  .catch((error) => {
    debug.log(error);
    return undefined;
  });
}

async function insertPeerVersion(dbTransaction: EntityManager, peerVersion: number, peerSubVersion: string): Promise<mPeerVersion | undefined> {
  const peerVersionData: mPeerVersion = {
    version: peerVersion,
    subVersion: peerSubVersion,
  };

  const newPeerVersion = dbTransaction.create(mPeerVersion, peerVersionData);
  return await dbTransaction.save(newPeerVersion)
  .catch((error) => {
    debug.log(error);
    return undefined;
  });
}

async function selectPeer(dbTransaction: EntityManager, peerIP: string): Promise<mPeer | undefined> {
  return await dbTransaction.findOne(mPeer, {
    where: { ip: peerIP }
  })
  .catch((error) => {
    debug.log(error);
    return undefined;
  });
}

async function insertPeer(dbTransaction: EntityManager, peerIP: string, peerPort: number | undefined, dbPeerVersion: mPeerVersion, dbCountry: mCountry): Promise<mPeer | undefined> {
  const peerData: mPeer = {
    ip : peerIP,
    port : peerPort,
    version : dbPeerVersion,
    country : dbCountry,
    connected : true,
  };

  const newPeer = dbTransaction.create(mPeer, peerData);
  return await dbTransaction.save(newPeer)
  .catch((error) => {
    debug.log(error);
    return undefined;
  });
}

async function updatePeer(dbTransaction: EntityManager, dbPeer: mPeer, peerPort: number | undefined, dbPeerVersion: mPeerVersion): Promise<boolean> {
  dbPeer.port = peerPort;
  dbPeer.version = dbPeerVersion;
  dbPeer.connected = true;

  return await dbTransaction.update(mPeer, dbPeer.id!, dbPeer)
  .then(() => {
    return true;
  })
  .catch((error: any) => {
    debug.log(error);
    return false;
  });
}

async function updateAllPeersToInactive(dbTransaction: EntityManager): Promise<boolean> {
  return await dbTransaction.createQueryBuilder()
  .update(mPeer)
  .set({ connected: false })
  .where("connected = true")
  .execute()
  .then(() => {
    return true;
  })
  .catch(error => {
    debug.log(error);
    return false;
  });
}

async function getPeerGeoIP(ip: string): Promise<{countryCode: string, countryName: string} | undefined> {
  return await axios.get('https://get.geojs.io/v1/ip/country/' + ip + '.json')
  .then(response => {
    // Return ISO code (2 letters)
    return { countryCode: String(response.data.country), countryName: String(response.data.name)};
  })
  .catch(error => {
    debug.log(error);
    return undefined;
  });
}

function getPeerIP(addr: string): string | undefined {
  const regexIPv4 = addr.match(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/);

  if (regexIPv4) {
    return regexIPv4[0];
  } else {
    debug.log('Invalid IP: ' + addr);
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