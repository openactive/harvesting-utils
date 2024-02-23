export type FeedContext = import('./models/FeedContext').FeedContext;
/**
 * @typedef {import('./models/FeedContext').FeedContext} FeedContext
 */
/**
 * @param {string} feedContextIdentifier
 * @param {string} baseUrl
 * @param {import('cli-progress').MultiBar} [multibar]
 * @returns {FeedContext}
 */
export function createFeedContext(feedContextIdentifier: string, baseUrl: string, multibar?: any): FeedContext;
/**
 * @param {FeedContext} c
 */
export function progressFromContext(c: FeedContext): {
    totalItemsQueuedForValidation: number;
    validatedItems: number;
    validatedPercentage: number;
    items: number;
};
