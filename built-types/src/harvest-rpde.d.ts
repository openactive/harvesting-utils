export type FeedContext = import('./models/FeedContext').FeedContext;
export type RpdePageProcessor = import('./models/RpdePageProcessor').RpdePageProcessor;
export type HarvestRpdeArgs = import('./models/HarvestRpde').HarvestRpdeArgs;
/**
 * @param {HarvestRpdeArgs} args
 *
 * @returns {Promise<import('./models/HarvestRpde').HarvestRpdeResponse>} Only returns if there is a fatal error.
 */
export function harvestRPDE(args: HarvestRpdeArgs): Promise<import('./models/HarvestRpde').HarvestRpdeResponse>;
/**
 * @param {HarvestRpdeArgs} args
 *
 * @returns {Promise<import('./models/HarvestRpde').HarvestRpdeResponse>} Only returns if there is a fatal error.
 */
export function harvestRPDELossless(args: HarvestRpdeArgs): Promise<import('./models/HarvestRpde').HarvestRpdeResponse>;
