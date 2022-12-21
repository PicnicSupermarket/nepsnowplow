// Decode a base64 encoded string
function base64Decode(encoded) {
    return Buffer.from(encoded, "base64").toString();
}

function base64Encode(decoded) {
    return Buffer.from(decoded).toString("base64");
}

module.exports = {
    encode: base64Encode,
    decode: base64Decode,
};
