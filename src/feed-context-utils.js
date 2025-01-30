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
  return context;
}

module.exports = {
  createFeedContext,
};
