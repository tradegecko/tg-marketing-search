# TradeGecko's marketing search

Search implementation for the TradeGecko marketing site

# Installation

- Install [Yarn](https://yarnpkg.com/lang/en/) and run `yarn install` in your terminal of choice.
- Run `yarn start` in your terminal of choice.

View the beginning of the terminal output to find which ports and routes are available. At the time of writing the available routes are `/site` and `/blog`.  
So if your port is set to `1234` then you can access blog search through `localhost:1234/blog`.

To search, append `?term=query` to the end of the URL. So to search the site, a possible URL would be: `localhost:1234/site?term=query`
