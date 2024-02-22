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
    totalItemsQueuedForValidation: any;
    validatedItems: any;
    validatedPercentage: number;
    items: any;
};
//# sourceMappingURL=feed-context-utils.d.ts.map