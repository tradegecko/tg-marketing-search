require('dotenv').config();
const FuzzySearch  = require('fuzzy-search');
const searchedPageList = require('./site-page-list.js');
const externalPageList = require('./external-page-list.js');
const Segment = require('analytics-node');

const analytics = new Segment(process.env.SEGMENT_WRITE_KEY);
const fullPageList = [];
const searcher = new FuzzySearch(fullPageList, ['title', 'description', 'author'], { sort: true, caseSensitive: false });
const maxPageCount = 20;

respreadAllPages();
searchedPageList.onComplete(_ => {
  respreadAllPages();
});
externalPageList.onComplete(_ => {
  respreadAllPages();
});

module.exports = initiSiteSearch;


function initiSiteSearch(request, response, next) {
  if (request.query['refresh-page-list-first'] && request.query['refresh-page-list-first'] === 'true') {
    searchedPageList.refreshList();
    externalPageList.refreshList();
  }

  searchSite(request, response, next);
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

  let lowerCaseTerm = request.query.term.trim().replace(/\s+/g, '').toLowerCase();

  response.status(200);
  let exactResults = fullPageList.filter(filterPageByTerm(lowerCaseTerm));
  let returnExactResults = exactResults.length > 0;
  let results;

  if (returnExactResults) {
    let prioritizePosts = prioritizePostsFor(lowerCaseTerm);
    results = exactResults.sort(prioritizePosts).slice(0, maxPageCount);
  } else {
    results = searcher.search(request.query.term).slice(0, maxPageCount);
  }

  response.send({
    exact: returnExactResults,
    results,
  });

  analytics.track({
    anonymousId: request.query.anonymousId || 'site search',
    event: 'Site search',
    properties: {
      term: request.query.term,
      normalizedTerm: lowerCaseTerm.replace(/[^a-z ]+/g, ''),
    },
  });
}

function filterPageByTerm(term) {
  return function(page) {
    if (!(page.title || page.description || page.author)) {
      return false;
    }
    return page.title.toLowerCase().includes(term)
      || page.description.toLowerCase().includes(term)
      || page.author.toLowerCase().includes(term);
  }
}

function prioritizePostsFor(term) {
  return function(a, b) {
    let titleScore = scoreFor('title', a, b);
    if (titleScore) { return titleScore; }

    let descriptionScore = scoreFor('description', a, b);
    if (descriptionScore) { return descriptionScore; }

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

function respreadAllPages() {
  fullPageList.splice(0, fullPageList.length, ...searchedPageList, ...externalPageList);
}
