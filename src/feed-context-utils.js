/**
 * @typedef {import('./models/FeedContext').FeedContext} FeedContext
 */

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
