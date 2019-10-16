function setHeaders(request, response, next) {
  response.header({
    'Access-Control-Allow-Origin':  request.headers.origin,
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  });

  next();
}


module.exports = setHeaders;
