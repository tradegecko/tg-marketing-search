const FuzzySearch  = require('fuzzy-search');
const sitePageList = require('./site-page-list.js');

const searcher     = new FuzzySearch(sitePageList, ['title', 'description', 'author'], { sort: true, caseSensitive: false });
const maxPageCount = 20;


module.exports = initiSiteSearch;


function initiSiteSearch(request, response, next) {
  if (sitePageList.initialised) {
    searchSite(request, response, next);
  } else {
    sitePageList.afterinit(() => {
      searchSite(request, response, next);
    });
  }
}

function searchSite(request, response, next) {
  if (!request.query.term) {
    response.status(400);
    response.send({
      errors: [
        'Search term required: Please provide a search term as a query parameter in the form of /?term=query',
      ]
    });
  }

  let lowerCaseTerm = request.query.term.toLowerCase();

  response.status(200);
  let exactResults = sitePageList.filter(filterPageByTerm(lowerCaseTerm));

  if (exactResults.length > 0) {
    let prioritizePosts = prioritizePostsFor(lowerCaseTerm);
    response.send({
      exact: true,
      results: exactResults.sort(prioritizePosts).slice(0, maxPageCount),
    });
  } else {
    response.send({
      exact: false,
      results: searcher.search(request.query.term).slice(0, maxPageCount),
    });
  }
}

function filterPageByTerm(term) {
  return function(page) {
    return page.title.toLowerCase().includes(term)
      || page.description.toLowerCase().includes(term)
      || page.author.toLowerCase().includes(term);
  }
}

function prioritizePostsFor(term) {
  return function(a, b) {
    if (a.title.toLowerCase().includes(term)) {
      if (!b.title.toLowerCase().includes(term)) {
        return -1;
      }
    } else if (b.title.toLowerCase().includes(term)) {
      return 1;
    }

    if (a.description.toLowerCase().includes(term)) {
      if (!b.description.toLowerCase().includes(term)) {
        return -1;
      }
    } else if (b.description.toLowerCase().includes(term)) {
      return 1;
    }

    if (a.author.toLowerCase().includes(term)) {
      if (!b.author.toLowerCase().includes(term)) {
        return -1;
      }
    } else if (b.author.toLowerCase().includes(term)) {
      return 1;
    }

    return 0;
  }
}
