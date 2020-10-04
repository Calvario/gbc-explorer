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

import { RequestHandler } from 'express';

function stringValidator<T>(): RequestHandler {
  return (request, response, next) => {

    const strRegex = RegExp('^[0-9a-zA-Z]*$');

    for(const param in request.params) {
      if (request.params.hasOwnProperty(param))
        if(!strRegex.test(request.params[param]!.toString()))
          return response.sendStatus(405)
    }

    if (request.query.constructor !== Object) {
      for(const query in request.query) {
        if (!request.query.hasOwnProperty(query))
          if(!strRegex.test(request.query[query]!.toString()))
            return response.sendStatus(405)
      }
    }

    return next();
  };
}

export default stringValidator;