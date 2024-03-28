class RpdeValidationErrorsError extends Error {
  /**
   * @param {string} feedContextIdentifier
   * @param {string} url
   * @param {unknown[]} rpdeValidationErrors
   */
  constructor(feedContextIdentifier, url, rpdeValidationErrors) {
    super(`RPDE Validation Error(s) found on RPDE feed ${feedContextIdentifier} page "${url}"`);
    this.feedContextIdentifier = feedContextIdentifier;
    this.url = url;
    this.rpdeValidationErrors = rpdeValidationErrors;
  }
}

module.exports = {
  RpdeValidationErrorsError,
};
