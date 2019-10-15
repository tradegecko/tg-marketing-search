require('dotenv').config();

const express     = require('express');

const domainCheck = require('./domain-check.js');
const setHeaders  = require('./set-headers.js');
const searchSite  = require('./search-site.js');
const searchBlog  = require('./search-blog.js');

const ROUTES = [
  {
    name: 'site search',
    path: '/site',
    use: [
      domainCheck,
      setHeaders,
      searchSite,
    ],
  },

  {
    name: 'blog search',
    path: '/blog',
    use: [
      domainCheck,
      setHeaders,
      searchBlog
    ],
  },
];
const app = express();


// ROUTING
app.use('/site/data', express.static('./cache'));

ROUTES.forEach(route => {
  app.get(route.path, ...route.use);
});

app.get('*', (request, resource, next) => {
  return resource
    .status(404)
    .send({
      errors: [
        `Content not found: This probably doesn't exist. Current pages include: ${
          ROUTES.map(route => route.path).join(', ')
        }`
      ],
    });
});
// END ROUTING


app.listen(
  process.env.PORT,
  () => {
    console.log(`Listening to routes:\n${
      ROUTES.map(route => ` - :${process.env.PORT}${route.path} => ${route.name}`).join('\n')
    }\n`);
  }
);
