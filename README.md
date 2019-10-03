# TradeGecko's marketing search

Search implementation for the TradeGecko marketing site

# Installation

Create a file called `.env` in the root directory and add the following paramters:

```sh
# Local settings
PORT=#[The port you want to run the server on]
TEST_MODE=true

# Hubspot details
HAPI_KEY=#[Hubspot HAPI key]
PORTAL_ID=#[Our Hubspot portal ID]

# Segemnt details
SEGMENT_WRITE_KEY=#[Segment write key]
```

- Install [Yarn](https://yarnpkg.com/lang/en/) and run `yarn install` in your terminal of choice.
- Run `yarn start` in your terminal of choice.

View the beginning of the terminal output to find which ports and routes are available. At the time of writing the available routes are `/site` and `/blog`.  
So if your port is set to `1234` then you can access blog search through `localhost:1234/blog`.

To search, append `?term=query` to the end of the URL. So to search the site, a possible URL would be: `localhost:1234/site?term=query`
