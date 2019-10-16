//const FuzzySearch  = require('fuzzy-search');
const Fuse = require('fuse.js');
const searchedPageList = require('./site-page-list.js');
const externalPageList = require('./external-page-list.js');
const track = require('./analytics.js');

const fullPageList = [];
var fuzzySearchOptions = {
  shouldSort: true,
  includeScore: true,
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
const searcher = new Fuse(fullPageList, fuzzySearchOptions);
const maxPageCount = 20;

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
    if (a.item[prop].toLowerCase().includes(term)) {
      if (!b.item[prop].toLowerCase().includes(term)) {
        return -1;
      }
      let offsetScore = a.item[prop].toLowerCase().indexOf(term) - b.item[prop].toLowerCase().indexOf(term);
      if (offsetScore){
        return offsetScore;
      }
    } else if (b.item[prop].toLowerCase().includes(term)) {
      return 1;
    }
  }
}

function prioritizeByScore(a, b) {
  if (a.item.priority === b.item.priority) {
    return b.item.score - a.item.score;
  } else {
    return b.item.priority - a.item.priority;
  }
};

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
  let prioritizePosts = prioritizePostsFor(lowerCaseTerm);
  let results = [...searcher.search(request.query.term)];
  results = results.sort(prioritizePosts);
  results = results.sort(prioritizeByScore);

  results = results.map(result => result.item);

  let totalResultCount = results.length;
  results = results.filter((filteringResult, indexOfThisResult, results) => {
    let firstResultWithSameUrl = results.find(findingResult => findingResult.url === filteringResult.url);
    if (indexOfThisResult === results.indexOf(firstResultWithSameUrl)) {
      return true;
    } else {
      return false;
    }
  });
  results = results.slice(0, maxPageCount);

  response.send({
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
