const { parse, isInteger } = require('lossless-json');

/**
 * @param {string} value
 * @returns {number | bigint}
 */
function convertNumberToBigIntIfLargeEnoughInt(value) {
  if (isInteger(value)) {
    const asInt = parseInt(value, 10);
    /* Note we consider equality to either of the bounds to be "too large" just
    to be extra cautious against the effects of precision loss */
    if (asInt >= Number.MAX_SAFE_INTEGER || asInt <= Number.MIN_SAFE_INTEGER) {
      return BigInt(value);
    }
    return asInt;
  }
  return parseFloat(value);
}

function jsonParseAllowingBigInts(text) {
  return parse(text, null, convertNumberToBigIntIfLargeEnoughInt);
}

module.exports = {
  jsonParseAllowingBigInts,
};
