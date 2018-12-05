require('dotenv').config();


module.exports = domainCheck;


const DOMAIN_WHITELIST = [
  'hs-sites.com',
  'www.tradegecko.com',
  's.codepen.io',
];

function domainCheck(request, response, next) {
  if (process.env.TEST_MODE === 'true') { return next(); }

  if (!request.headers.origin) {
    return response
      .status(401)
      .send({ errors: ['Access denied: undefined domain'] });
  }

  let url = new URL(request.headers.origin);
  if (!DOMAIN_WHITELIST.includes(url.hostname)) {
    return response
      .status(401)
      .send({ errors: ['Access denied: domain not permitted'] });
  }

  return next();
}
