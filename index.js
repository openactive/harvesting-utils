const { harvestRPDE } = require('./src/harvest-rpde');
const { createFeedContext, progressFromContext } = require('./src/feed-context-utils');

/**
 * @typedef {import('./dist/harvest-rpde').RpdePageProcessor} RpdePageProcessor
 * @typedef {import('./models/FeedContext').FeedContext} FeedContext
 */

module.exports = {
  harvestRPDE,
  createFeedContext,
  progressFromContext,
};
