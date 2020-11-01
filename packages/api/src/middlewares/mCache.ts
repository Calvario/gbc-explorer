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

import debug from 'debug';
import redis from 'redis';
import { RequestHandler } from 'express';

let client: redis.RedisClient;

function redisCache<T>(duration: number): RequestHandler {
  return (request, response, next) => {
    // Only create a client if undefined
    if (client === undefined) {
      client = redis.createClient({
        host: process.env.REDIS_HOST!,
        port: Number(process.env.REDIS_PORT!),
        password: process.env.REDIS_PASSWORD! !== '' ? process.env.REDIS_PASSWORD! : undefined,
      });
    }

    const key = request.url;
    client.get(key, (err, result) => {
      if (err === null && result !== null) {
        return response.json(JSON.parse(result));
      } else {
        response._json = response.json;
        response.json = (json) => {
          try {
            client.set(key, JSON.stringify(json), 'EX', duration, (error, reply) => {
              if (error || reply !== 'OK') {
                debug.log('error: ' + error + ', reply: ' + reply);
              }
              return response._json(json);
            })
          } catch (error) {
            debug.log('error: ' + error)
            return response._json(json);
          }
        }
        return next();
      }
    });
  };
}

export default redisCache;