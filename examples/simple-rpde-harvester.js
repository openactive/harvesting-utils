// TODO3 check this
const { harvestRPDE } = require('..');

function run() {
  // This is the URL of the RPDE feed
  const baseUrl = 'https://reference-implementation.openactive.io/feeds/scheduled-sessions';

  // This is the feed context identifier
  const feedContextIdentifier = 'ScheduledSessions';

  // This is the function which will be called for each page of the RPDE feed
  const processPage = async (rpdePage, feedIdentifier) => {
    console.log(`${feedIdentifier}: Processing page ${rpdePage.next}`);
  };

  // This is the function which will be called when the feed has reached its end
  const onFeedEnd = async () => {
    console.log('Feed has reached its end');
    process.exit(0);
  };

  const onError = () => {
    console.log('Error occurred');
    process.exit(1);
  };

  // This is the function which will be called to get the headers for the RPDE feed
  const headers = async () => ({});

  // This determines where the feed is an Orders feed
  const isOrdersFeed = false;

  // Harvest the RPDE feed
  harvestRPDE({
    baseUrl,
    feedContextIdentifier,
    headers,
    processPage,
    isOrdersFeed,
  });
}

run();
