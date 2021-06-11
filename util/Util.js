const path = require('path');
const fs = require('fs');
const Constants = require("./Constants.js");
const crypto = require('crypto');
const logger = require("./Logger.js").logger;
const https = require('https');

require('dotenv').config({path: __dirname + '/.env'});

/**
 * Create a random hex string with a given size
 *
 * @param len {Integer} Length of string to be created
 */
module.exports.generateToken = function(len) {
    if (len == null) len = 32;
    var maxlen = 8,
    min = Math.pow(16,Math.min(len,maxlen)-1)
    max = Math.pow(16,Math.min(len,maxlen)) - 1,
    n   = Math.floor( Math.random() * (max-min+1) ) + min,
    r   = n.toString(16);
    while ( r.length < len ) {
        r = r + module.exports.generateToken( len - maxlen );
    }
    return r;
};

/**
 * Return absolute location of file pointed by filename
 *
 * @param filename {String} File to be located
 */
module.exports.fetchFile = function(filename) {
    return path.join(__dirname + "/../" + filename);
}

/**
 * Preprocess the bearer token in the request header
 *
 * @param authToken {String} Token to be parsed
 */
module.exports.parseAuthToken = function(authToken) {
    if (authToken == undefined) {
        return null;
    }
    if (authToken.substr(0, Constants.AUTH_TOKEN_NAME.length) !== Constants.AUTH_TOKEN_NAME) {
        return null;
    }
    if (authToken.substr(Constants.AUTH_TOKEN_NAME.length).length != Constants.AUTH_TOKEN_LENGTH) {
        return null;
    }

    return authToken.substr(Constants.AUTH_TOKEN_NAME.length);
}

/**
 * Find an error by its name
 *
 * @param name {String} Error to find
 */
module.exports.findErrorByName = function(name) {
    let rawdata = fs.readFileSync(module.exports.fetchFile(Constants.SCRIPT_ERRORS_PATH));
    let parsedData = JSON.parse(rawdata);
    var code = parsedData.length - 1
    while (1) {
        if (parsedData[code]["Name"] == name) break;
        code -= 1;
        if (code < 0) { code = 1; break; }
    }
    return parsedData[code];
}

/**
 * Returns true if the server is running locally, and false otherwise
 */
module.exports.isLocalEnvironment = (process.env.NODE_ENV === 'local');

/**
 * Returns server url
 */
module.exports.serverUrl = (process.env.SERVER_URL != null ? process.env.SERVER_URL : Constants.SERVER_URL_DEFAULT)

/**
 * Return a salted hash created from username and password
 *
 * @param username {String} Username (primary key)
 * @param password {String} Password
 */
module.exports.saltAndHashPassword = function(username, password) {
    return crypto.createHmac('sha256', process.env.PASSWORD_HASHING_SECRET)
                   .update(username + "." + password)
                   .digest('hex');
}

/**
 * Insert variables inside strings
 *
 * @param str {String} String to use as base
 * @param args* {String} Parameters to be inserted inside str
 */
module.exports.format = function (str) {
    var args = [].slice.call(arguments, 1),
        i = 0;

    return str.replace(/%s/g, () => args[i++]);
}

/**
 * Make a request to a given URL (synchronous)
 *
 * @param reqUrl {String} URL of GET request
 */
module.exports.request = function (reqUrl) {
    return new Promise((resolve, reject) => {
        let responseBuffer = "";
        https.get(reqUrl, (resp) => {
            // A chunk of data has been received.
            resp.on('data', (chunk) => {
                //logger.debug("Got data: " + chunk)
                responseBuffer += chunk;
            });
    
            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                //logger.debug("Request done!", JSON.parse(responseBuffer));
                resolve(responseBuffer);
            });
    
        }).on("error", (err) => {
            //logger.error("Error: " + err.message);
            reject(err);
        });
    });
}

// /**
//  * Get a single message from an IPC message queue
//  *
//  * @param queue {posixmq} message queue to fetch the message
//  */
// module.exports.getMessageFromQueue = function (queue) {
//     console.log("Getting msg")
//     return new Promise((resolve, reject) => {
//         let n;
//         let readbuf = Buffer.alloc(queue.msgsize);
//         let waiting = true;

//         queue.on('messages', () => {
//             if (waiting) {
//                 let msg;
//                 n = queue.shift(readbuf);
//                 if (n === false) {
//                     reject("No messages");
//                 }
//                 msg = readbuf.toString('utf8', 0, n);
//                 console.log("Received message("+ n +" bytes): " + msg);
//                 waiting = false;
//                 // Reset events
//                 queue.on('messages', () => {});
//                 resolve(msg);
//             }
//             reject("Not waiting");
//         });
//     });
// }

/*
 * Return a default, b64-encoded, profile picture in case user has not provided one
 */
module.exports.getDefaultProfilePic = function() {
    return fs.readFileSync(this.fetchFile(Constants.DEFAULT_PIC_PATH), 'utf8')
}
