/**
 * @typedef {import('./models/FeedContext').FeedContext} FeedContext
 */

/* TODO[suggestion] put FeedContext into a class so that it controls access to itself? And so that all it's logic
(e.g. progressbar updating stuff) can be in one place? */
/**
 * @param {string} baseUrl
 * @returns {FeedContext}
 */
function createFeedContext(baseUrl) {
  /** @type {FeedContext} */
  const context = {
    currentPage: baseUrl,
    pageIndex: 0,
    items: 0,
    responseTimes: [],
    totalItemsQueuedForValidation: 0,
    validatedItems: 0,
  };
  // TODO3 put this into Broker
  // if (multibar) {
  //   context._progressbar = multibar.create(0, 0, {
  //     feedIdentifier: feedContextIdentifier,
  //     pages: 0,
  //     responseTime: '-',
  //     status: 'Harvesting...',
  //     ...progressFromContext(context),
  //   });
  // }
  return context;
}

// TODO3 move this into Broker
// /**
//  * @param {FeedContext} c
//  */
// function progressFromContext(c) {
//   return {
//     totalItemsQueuedForValidation: c.totalItemsQueuedForValidation,
//     validatedItems: c.validatedItems,
//     validatedPercentage: c.totalItemsQueuedForValidation === 0 ? 0 : Math.round((c.validatedItems / c.totalItemsQueuedForValidation) * 100),
//     items: c.items,
//   };
// }

module.exports = {
  createFeedContext,
};
