export class RpdeValidationErrorsError extends Error {
    /**
     * @param {string} feedContextIdentifier
     * @param {string} url
     * @param {unknown[]} rpdeValidationErrors
     */
    constructor(feedContextIdentifier: string, url: string, rpdeValidationErrors: unknown[]);
    feedContextIdentifier: string;
    url: string;
    rpdeValidationErrors: unknown[];
}
