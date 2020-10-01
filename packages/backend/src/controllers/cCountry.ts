import { EntityManager } from "typeorm";
import { mCountry } from '@calvario/gbc-explorer-shared';

export class Country {
  static async select(dbTransaction: EntityManager, countryCode: string, countryName: string): Promise<mCountry> {
    return await dbTransaction.findOne(mCountry, {
      where: { code: countryCode }
    })
      .then(async dbCountry => {
        if (dbCountry === undefined)
          return await this.create(dbTransaction, countryCode, countryName)
            .catch(error => {
              return Promise.reject(error);
            });
        else
          return dbCountry;
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  static async create(dbTransaction: EntityManager, countryCode: string, countryName: string): Promise<mCountry> {
    const countryData: mCountry = {
      code: countryCode,
      name: countryName,
    };

    const newCountry = dbTransaction.create(mCountry, countryData);
    return await dbTransaction.save(newCountry)
      .catch(error => {
        return Promise.reject(error);
      });
  }
}