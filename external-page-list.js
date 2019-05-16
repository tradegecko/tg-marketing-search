require('dotenv').config();
const https = require('https');
const fs = require('fs');

const resultsCachePath = './cache/cached-hubdb-pages.json';
const HAPI_KEY = process.env.HAPI_KEY;
const PORTAL_ID = process.env.PORTAL_ID;
const limit = 100;
const updatePeriod = 60 * 60 * 1000;
const columnMap = {
  title: 2,
  description: 3,
  url: 4,
  author: 5,
  image: 6,
};
const pagesAPIBaseURL = `https://api.hubapi.com/hubdb/api/v2/tables/1034244/rows?hapikey=${HAPI_KEY}&limit=${limit}&portalId=${PORTAL_ID}`;
let updateTimeout = null;
let currentlyUpdating = false;

let completeCallbacks = [];

const allPages = JSON.parse(fs.readFileSync(resultsCachePath));
allPages.refreshList = updatePageList;
allPages.onUpdate = func => completeCallbacks.push(func);

module.exports = allPages;

updatePageList();

async function updatePageList() {
  if (currentlyUpdating) { return; }
  clearTimeout(updateTimeout);
  currentlyUpdating = true;

  let validPages = [];
  let offset = 0;
  let responseData = null;
  let cancelUpdate = false;

  do {
    console.log(`Fetching data on ${limit} site pages starting with offset of ${offset}.`);
    try {
      responseData = JSON.parse(await get(`${pagesAPIBaseURL}&offset=${offset}`));
      let pages = responseData.objects || [];
      console.log(` - ${pages.length} site pages returned on page ${offset / limit + 1}`);
      if (pages.length) {
        let mappedPages = pages.map(mapPage);
        console.log(` - added ${mappedPages.length} pages from page ${offset / limit + 1}`);
        validPages.push(...mappedPages);
      }
    } catch(e) {
      cancelUpdate = true;
      console.log(e);
    }
    offset += limit;
  } while(responseData.objects && responseData.objects.length > 0);

  if (!cancelUpdate) {
    allPages.splice(0, allPages.length, ...validPages);
    fs.writeFile(resultsCachePath, JSON.stringify(validPages), err => {
      if (err) throw err;
      console.log('The valid pages json was successfully updated.');
    });
    console.log(`Finished updating site page list. Total pages: ${allPages.length}`);
    runCompleteCallbacks();
  }

  console.log(`Will update external page list again in ~${Math.round(updatePeriod / 1000 / 60)} minutes.`);
  updateTimeout = setTimeout(updatePageList, updatePeriod);
  currentlyUpdating = false;

  return cancelUpdate ? 'external page list update failed' : 'external page list updated';
};

function runCompleteCallbacks() {
  completeCallbacks.forEach(func => func(allPages));
}

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

function mapPage(data) {
  return {
    title:       data.values[columnMap.title]       || '',
    description: data.values[columnMap.description] || '',
    url:         data.values[columnMap.url]         || '',
    author:      data.values[columnMap.author]      || '',
    image:       (data.values[columnMap.image] && data.values[columnMap.image].url ) || '',
    imageAlt:    '',
  };
}
