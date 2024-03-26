const { parse, isInteger } = require('lossless-json');

function millisToMinutesAndSeconds(millis) {
  const minutes = Math.floor(millis / 60000);
  const seconds = ((millis % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds.toFixed(0)}`;
}

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
  millisToMinutesAndSeconds,
  jsonParseAllowingBigInts,
};
