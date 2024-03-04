const { harvestRPDE } = require('./src/harvest-rpde');
const { createFeedContext, progressFromContext } = require('./src/feed-context-utils');

/**
 * @typedef {import('./src/harvest-rpde').RpdePageProcessor} RpdePageProcessor
 * @typedef {import('./src/models/FeedContext').FeedContext} FeedContext
 */

module.exports = {
  harvestRPDE,
  createFeedContext,
  progressFromContext,
};
