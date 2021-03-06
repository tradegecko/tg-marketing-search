require('dotenv').config();
const https = require('https');
const fs = require('fs');

const HAPI_KEY = process.env.HAPI_KEY;


const resultsCachePath = './cache/cached-searched-pages.json';
const limit = 100;
const updatePeriod = 60 * 60 * 1000;
const pagesAPIBaseURL = `https://api.hubapi.com/content/api/v2/pages?hapikey=${HAPI_KEY}&limit=${limit}`;
let updateTimeout = null;
let currentlyUpdating = false;

let completeCallbacks = [];
const allPages = JSON.parse(fs.readFileSync(resultsCachePath));


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

function prunePages(data) {
  if (
    data.deleted_at === 0
    && data.currently_published
    && (
      data.name
      && data.name.toLowerCase().replace(/[-_ ]+/g, ' ').includes('[site page]')
    )
  ) {
    return true;
  }
  return false;
}

function simplifyPage(data) {
  return {
    title:       data.title || '',
    description: data.meta_description || '',
    tags:        '',
    url:         data.absolute_url || '',
    image:       (data.use_featured_image && data.featured_image) || data.screenshot_preview_url || '',
    imageAlt:    data.featured_image_alt_text || '',
    author:      data.author_name || '',
    priority:    0,
  };
}

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
      let pages = responseData.objects;
      console.log(` - ${pages.length} site pages returned on page ${offset / limit + 1}`);
      if (pages.length) {
        let filteredPages = pages.filter(prunePages);
        let simplifiedPages = filteredPages.map(simplifyPage);
        console.log(` - ${simplifiedPages.length} site pages found to be usable on page ${offset / limit + 1}`);
        validPages.push(...simplifiedPages);
      }
    } catch(e) {
      cancelUpdate = true;
      console.log(e);
    }
    offset += limit;
  } while(responseData.objects.length > 0);

  if (!cancelUpdate) {
    allPages.splice(0, allPages.length, ...validPages);
    fs.writeFile(resultsCachePath, JSON.stringify(validPages), err => {
      if (err) throw err;
      console.log('The valid pages json was successfully updated.');
    });
    console.log(`Finished updating site page list. Total pages: ${allPages.length}`);
    runCompleteCallbacks();
  }

  console.log(`Will update site page list again in ~${Math.round(updatePeriod / 1000 / 60)} minutes.`);
  updateTimeout = setTimeout(updatePageList, updatePeriod);
  currentlyUpdating = false;

  return cancelUpdate ? 'site page list update failed' : 'site page list updated';
};


allPages.refreshList = updatePageList;
allPages.onUpdate = func => completeCallbacks.push(func);
updatePageList();


module.exports = allPages;
