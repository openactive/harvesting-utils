export type FeedContext = import('./models/FeedContext').FeedContext;
/**
 * @typedef {import('./models/FeedContext').FeedContext} FeedContext
 */
/**
 * @param {string} baseUrl
 * @returns {FeedContext}
 */
export function createFeedContext(baseUrl: string): FeedContext;
