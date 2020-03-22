let randomString = require('crypto-random-string');

module.exports = {
    randString: () => {
        return randomString({
            length: 16,
            type: 'base64'
        });
    }
};