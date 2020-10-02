import debug from 'debug';
import redis from 'redis';
import { RequestHandler } from 'express';

function redisCache<T>(duration: number): RequestHandler {
  return (request, response, next) => {
    const key = request.url;
    const client = redis.createClient({
      host: process.env.REDIS_HOST!,
      port: Number(process.env.REDIS_PORT!),
      password: process.env.REDIS_PASSWORD! !== '' ? process.env.REDIS_PASSWORD! : undefined,
    });

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