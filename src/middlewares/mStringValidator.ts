import { RequestHandler } from 'express';

function stringValidator<T>(): RequestHandler {
	return (request, response, next) => {

    const strRegex = RegExp('^[0-9a-zA-Z]*$');

    for(const param in request.params) {
      if (request.params.hasOwnProperty(param))
        if(!strRegex.test(request.params[param]!.toString()))
          return response.status(405).send("Invalid parameter");
    }

		if (request.query.constructor !== Object) {
      for(const query in request.query) {
        if (!request.query.hasOwnProperty(query))
          if(!strRegex.test(request.query[query]!.toString()))
            return response.status(405).send("Invalid parameter");
      }
    }

    return next();
	};
}

export default stringValidator;