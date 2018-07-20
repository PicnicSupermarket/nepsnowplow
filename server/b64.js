// Decode a base64 encoded string
function base64Decode(encoded) {
    return new Buffer(encoded, "base64").toString();
}

module.exports = base64Decode;
