require('dotenv').config();

const express     = require('express');

const domainCheck = require('./domain-check.js');
const setHeaders  = require('./set-headers.js');
const searchSite  = require('./search-site.js');
const searchBlog  = require('./search-blog.js');


const app = express();

app.use(express.json());
app.use('/site/data', express.static('./cache'));

app.get('/site',
  domainCheck,
  setHeaders,
  searchSite
);

app.get('/blog',
  domainCheck,
  setHeaders,
  searchBlog
);

app.get('*', (request, resource, next) => {
  return resource
    .status(404)
    .send({ errors: ['Content not found: This probably doesn\'t exist.'] });
});


app.listen(process.env.PORT, () =>
  console.log(`Listening to port: ${process.env.PORT}`));
