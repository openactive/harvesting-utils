const { harvestRPDE, harvestRPDELossless } = require('./src/harvest-rpde');
const { createFeedContext } = require('./src/feed-context-utils');

/**
 * @typedef {import('./src/harvest-rpde').RpdePageProcessor} RpdePageProcessor
 * @typedef {import('./src/models/FeedContext').FeedContext} FeedContext
 * @typedef {import('./src/models/HarvestRpde').HarvestRpdeArgs} HarvestRpdeArgs
 */

module.exports = {
  harvestRPDE,
  harvestRPDELossless,
  createFeedContext,
};
