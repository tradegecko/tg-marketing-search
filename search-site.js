//const FuzzySearch  = require('fuzzy-search');
const Fuse = require('fuse.js');
const searchedPageList = require('./site-page-list.js');
const externalPageList = require('./external-page-list.js');
const track = require('./analytics.js');

const fullPageList = [];
var fuzzySearchOptions = {
  shouldSort: true,
  threshold: 0.5,
  location: 0,
  maxPatternLength: Infinity,
  keys: [
    {
      name: 'title',
      weight: 0.4,
    },
    {
      name: 'tags',
      weight: 0.3,
    },
    {
      name: 'description',
      weight: 0.2,
    },
    {
      name: 'author',
      weight: 0.1,
    },
  ],
};
//const searcher = new FuzzySearch(fullPageList, ['title', 'description', 'author'], { sort: true, caseSensitive: false });
const searcher = new Fuse(fullPageList, fuzzySearchOptions)
const maxPageCount = 20;


function filterPageByTerm(term) {
  return function(page) {
    if (!(page.title || page.description || page.author)) {
      return false;
    }
    return page.title.toLowerCase().includes(term)
      || page.description.toLowerCase().includes(term)
      || page.tags.toLowerCase().includes(term)
      || page.author.toLowerCase().includes(term);
  }
}

function prioritizePostsFor(term) {
  return function(a, b) {
    let titleScore = scoreFor('title', a, b);
    if (titleScore) { return titleScore; }

    let descriptionScore = scoreFor('description', a, b);
    if (descriptionScore) { return descriptionScore; }

    let tagsScore = scoreFor('tags', a, b);
    if (tagsScore) { return tagsScore; }

    let authorScore = scoreFor('author', a, b);
    if (authorScore) { return authorScore; }

    return 0;
  }

  function scoreFor(prop, a, b) {
    if (a[prop].toLowerCase().includes(term)) {
      if (!b[prop].toLowerCase().includes(term)) {
        return -1;
      }
      let offsetScore = a[prop].toLowerCase().indexOf(term) - b[prop].toLowerCase().indexOf(term);
      if (offsetScore){
        return offsetScore;
      }
    } else if (b[prop].toLowerCase().includes(term)) {
      return 1;
    }
  }
}

function unique(item, i, array) {
  return array.indexOf(item) === i;
}

function searchSite(request, response, next) {
  if (!request.query.term) {
    response.status(400);
    response.send({
      errors: [
        'Search term required: Please provide a search term as a query parameter in the form of /?term=query',
      ],
    });
  }

  let lowerCaseTerm = request.query.term.trim().replace(/\s+/g, ' ').toLowerCase();

  response.status(200);
  let exactResults = fullPageList.filter(filterPageByTerm(lowerCaseTerm));
  let returnExactResults = exactResults.length > 0;
  let prioritizePosts = prioritizePostsFor(lowerCaseTerm);
  let results = [...exactResults].sort(prioritizePosts);
  let exactResultCount = results.length;
  let includeFuzzyResults = false;
  let fuzzyResultCount = 0;

  if (exactResultCount < maxPageCount) {
    results = [
      ...results,
      ...searcher.search(request.query.term),
    ].filter(unique);
    if (results.length > exactResultCount) {
      includeFuzzyResults = true;
    }
    fuzzyResultCount = results.length - exactResultCount;
  }
  let totalResultCount = results.length;

  results = results.slice(0, maxPageCount);

  response.send({
    exact: returnExactResults,
    exactCount: exactResultCount,
    fuzzy: includeFuzzyResults,
    fuzzyCount: fuzzyResultCount,
    totalResultCount: totalResultCount,
    page: {
      length: maxPageCount,
      count: Math.ceil(totalResultCount / maxPageCount),
    },
    results,
  });

  track({
    anonymousId: request.query.anonymousId || 'site search',
    event: 'Site search',
    properties: {
      term: request.query.term,
      normalizedTerm: lowerCaseTerm.replace(/[^\w\s]+/g, ''),
      exact: returnExactResults,
      resultCount: results.length,
    },
  });
}

function respreadAllPages() {
  fullPageList.splice(0, fullPageList.length, ...searchedPageList, ...externalPageList);
}

function initiSiteSearch(request, response, next) {
  if (request.query['refresh-page-list-first'] && request.query['refresh-page-list-first'] === 'true') {
    searchedPageList.refreshList();
    externalPageList.refreshList();
  }

  searchSite(request, response, next);
}


respreadAllPages();
searchedPageList.onUpdate(_ => {
  respreadAllPages();
});
externalPageList.onUpdate(_ => {
  respreadAllPages();
});


module.exports = initiSiteSearch;
