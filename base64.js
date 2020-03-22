module.exports = {
    toBase64: (buffer) => {
        return buffer.toString('base64');
    },
    fromBase64: (d) => {
        return Buffer.from(d, 'base64');
    }
};