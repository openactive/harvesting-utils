export type FeedContext = import('./models/FeedContext').FeedContext;
/**
 * @typedef {import('./models/FeedContext').FeedContext} FeedContext
 */
/**
 * @param {string} feedContextIdentifier
 * @param {string} baseUrl
 * @returns {FeedContext}
 */
export function createFeedContext(feedContextIdentifier: string, baseUrl: string): FeedContext;
