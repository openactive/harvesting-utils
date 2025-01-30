const { harvestRPDE } = require('..');

function run() {
  // This is the URL of the RPDE feed
  const baseUrl = 'https://reference-implementation.openactive.io/feeds/facility-uses';

  // This is the feed context identifier
  const feedContextIdentifier = 'FacilityUses';

  // This is the function which will be called to get the headers for the RPDE feed
  const headers = async () => ({});

  // This determines where the feed is an Orders feed
  const isOrdersFeed = false;

  // Harvest the RPDE feed
  harvestRPDE({
    baseUrl,
    feedContextIdentifier,
    headers,
    processPage: async ({
      rpdePage,
      reqUrl,
    }) => {
      console.log(`${feedContextIdentifier}: Processing page @ ${reqUrl}. Items: ${rpdePage.items.length}`);
    },
    onReachedEndOfFeed: async () => {
      console.log('Feed has reached its end');
      process.exit(0);
    },
    onRetryDueToHttpError: async (reqUrl, reqHeaders, resStatusCode, error) => {
      console.error(`Retrying @ ${reqUrl} due to HTTP error ${resStatusCode}:`, error.message);
    },
    isOrdersFeed,
  }).then(({ error }) => {
    if (error) {
      console.error('FATAL ERROR:', error);
      process.exit(1);
    }
  });
}

run();
