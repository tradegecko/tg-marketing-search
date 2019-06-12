require('dotenv').config();
const https = require('https');

const HAPI_KEY = process.env.HAPI_KEY;


const version = '1.0.1'
const BASE_URL = 'https://api.hubapi.com/content/api/v2/blog-posts';
const API_PARAMS = [
  `hapikey=${HAPI_KEY}`,
  'archived=false',
  'state=PUBLISHED',
  'order_by=-publish_date',
  'content_group_id=2125467268'
];

const CACHE_LIFESPAN   = 1000 * 60 * 60 * 6; // 6 hours
const CACHED_SEARCHES = {};

function buildAPICall(searchTerm) {
  let searchParam = `name__icontains=${ searchTerm }`;
  return `${ BASE_URL }?${ [...API_PARAMS, searchParam].join('&') }`;
}

function initiateSearch(request, response, next) {
  let searchTerm = request.query.term;

  if (!searchTerm) {
    response
      .status(400)
      .send({ errors: ['No search term provided.'] });
    return;
  }

  if (CACHED_SEARCHES[searchTerm]) {
    response
      .status(200)
      .send(CACHED_SEARCHES[searchTerm].data);
    return;
  }

  let searchURL  = buildAPICall(searchTerm);
  https.get(searchURL, httpsRes => {
    let contentType = httpsRes.headers['content-type'];

    let error;
    if (httpsRes.statusCode !== 200) {
      error = `Request Failed. Status Code: ${ httpsRes.statusCode }`;
    } else if (!/^application\/json/.test(contentType)) {
      error = `Invalid content-type. Expected application/json but received ${ contentType }`;
    }

    if (error) {
      reject(error.message);
      httpsRes.resume();
      return;
    }

    let rawData = '';
    httpsRes.setEncoding('utf8');
    httpsRes.on('data', chunk => {
      rawData += chunk;
    });
    httpsRes.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        parsedData.tg_blog_search_meta = {
          version,
        };
        resolve(parsedData);
      } catch (e) {
        reject(e.message);
      }
    });
  }).on('error', e => {
    reject(e.message);
  });

  function resolve(data) {
    CACHED_SEARCHES[searchTerm] = {
      data,
      ts: (new Date()).getTime(),
    };

    response
      .status(200)
      .send(data);
  }

  function reject (error) {
    response
      .status(502)
      .send({ errors: [ error ] });
  }
}

function pruneCache() {
  let currentTime = (new Date()).getTime();

  Object.keys(CACHED_SEARCHES).forEach(searchTerm => {
    if (currentTime - CACHED_SEARCHES[searchTerm].ts > CACHE_LIFESPAN) {
      delete CACHED_SEARCHES[searchTerm];
    }
  });
}


setInterval(pruneCache, CACHE_LIFESPAN / 4);


module.exports = initiateSearch;
