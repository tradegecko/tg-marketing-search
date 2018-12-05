require('dotenv').config();
const https = require('https');

const HAPI_KEY = process.env.HAPI_KEY;
const limit = 100;
const updatePeriod = 60 * 60 * 1000;
const pagesAPIBaseURL = `https://api.hubapi.com/content/api/v2/pages?hapikey=${HAPI_KEY}&limit=${limit}`;
let allPages = [];

module.exports = allPages;

updatePageList();

async function updatePageList() {
  let validPages = [];
  let offset = 0;
  let responseData = null;

  do {
    console.log(`Fetching data on ${limit} site pages starting with offset of ${offset}.`);
    try {
      responseData = JSON.parse(await get(`${pagesAPIBaseURL}&offset=${offset}`));
      let pages = responseData.objects;
      console.log(` - ${pages.length} site pages returned on page ${offset / limit + 1}`);
      if (pages.length) {
        let filteredPages = pages.filter(prunePages);
        let simplifiedPages = filteredPages.map(simplifyPage);
        console.log(` - ${simplifiedPages.length} site pages found to be usable on page ${offset / limit + 1}`);
        validPages.push(...simplifiedPages);
      }
    } catch(e) {
      console.log(e);
    }
    offset += limit;
  } while(responseData.objects.length > 0);

  allPages.splice(0, allPages.length, ...validPages);
  console.log(`Finished updating site page list. Total pages: ${allPages.length}`);

  console.log(`Will update site page list again in ~${Math.round(updatePeriod / 1000 / 60)} minutes.`);
  setTimeout(updatePageList, updatePeriod);
};

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resource) => {
      var data = '';
      resource.on('data', (chunk) => {
        data += chunk;
      });
      resource.on('end', () => {
        resolve(data);
      });
    })
    .on('error', error => {
      reject(error);
    });
  });
}

function prunePages(data) {
  if (
       data.deleted_at === 0
    && data.currently_published
    //&& (data.name && data.name.includes('[Site Page]'))
  ) {
    return true;
  }
  return false;
}

function simplifyPage(data) {
  return {
    title:       data.title || '',
    description: data.meta_description || '',
    url:         data.absolute_url || '',
    image:       (data.use_featured_image && data.featured_image) || data.screenshot_preview_url || '',
    imageAlt:    data.featured_image_alt_text || '',
    author:      data.author_name || '',
  };
}
