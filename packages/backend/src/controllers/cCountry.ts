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

import { EntityManager } from "typeorm";
import { mCountry } from '@calvario/gbc-explorer-shared';

export class Country {
  static async select(dbTransaction: EntityManager, countryCode: string, countryName: string): Promise<mCountry> {
    return dbTransaction.findOne(mCountry, {
      where: { code: countryCode }
    })
      .then(async dbCountry => {
        if (dbCountry === undefined)
          return this.create(dbTransaction, countryCode, countryName)
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
    return dbTransaction.save(newCountry)
      .catch(error => {
        return Promise.reject(error);
      });
  }
}