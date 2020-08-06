import { RequestHandler } from 'express';

function stringValidator<T>(): RequestHandler {
	return (request, response, next) => {
		if (request.query.constructor === Object) {
			return next();
		}

		for(const query in request.query) {
			if (request.query.hasOwnProperty(query)) {
				const strRegex = RegExp('^[0-9a-zA-Z]*$');
				if(strRegex.test(request.query[query]!.toString())) {
					return next();
				} else {
					return response.status(405).send("Invalid parameter");
				}
			} else {
				return response.status(405).send("No parameter");
			}
		}
	};
}

export default stringValidator;