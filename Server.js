const express = require('express');
const server = express();
const Constants = require("./util/Constants");
const {spawn} = require('child_process');
const fs = require('fs');
const mongo = require("./util/MongoHelper.js");
const assert = require('assert');
const userModel = require("./util/model/User.js");
const serverUtils = require("./util/Util.js");
const logger = require("./util/Logger.js").logger;
const mailer = require("./util/MailerHelper.js");
const handlebars = require('handlebars');

// JSON via post
const bodyParser = require('body-parser');
const { Logger } = require('mongodb');
const { exit } = require('process');

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));

// Environment variables
require('dotenv').config({path: __dirname + '/util/.env'});
require('dotenv').config({path: __dirname + '/script/.env'});

// Cookies
function parseCookies (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

// Error handling
function sendErrorMessage(code, request, response) {
    let error = serverUtils.findErrorByName(code);
    let errorData = error["Data"][request.header("Locale") != null ? request.header("Locale") : Constants.DEFAULT_LOCALE];
    let thisErr = {
        "Error": errorData["PrettyName"],
        "Description": errorData["Description"],
        "Code": error["id"]
    }
    response.status(error["HttpReturn"]).header("Content-Type", "application/json").send(JSON.stringify(thisErr));
}

function sendOKMessage(request, response) {
    let error = serverUtils.findErrorByName("Success");
    let errorData = error["Data"][request.header("Locale") != null ? request.header("Locale") : Constants.DEFAULT_LOCALE];
    let thisErr = {
        "Error": errorData["PrettyName"],
        "Description": errorData["Description"],
        "Code": error["id"]
    }
    response.status(error["HttpReturn"]).header("Content-Type", "application/json").send(JSON.stringify(thisErr));
}

//Email-Template
var readHTMLFile = function(path, callback) {
    fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
        if (err) {
            throw err;
            callback(err);
        }
        else {
            callback(null, html);
        }
    });
};

// =================================== Requests ===================================

server.post(Constants.CREATE_ACCOUNT_REQUEST, async function(req, res) {
    let data = req.body;
    
    let findResult = await mongo.db.collection('users').findOne({[Constants.USER_EMAIL_KEY]:data[Constants.USER_EMAIL_KEY]});
    if (findResult) {
        logger.info("Account requested for PK ("  + Constants.USER_EMAIL_KEY + ") " + data[Constants.USER_EMAIL_KEY] + " already in use");
        sendErrorMessage("PrimaryKeyInUse", req, res);
        return 
    }

    var newUser = new userModel.User(
        data[Constants.USER_EMAIL_KEY], 
        data[Constants.USER_NAME_KEY], 
        serverUtils.saltAndHashPassword(
            data[Constants.USER_EMAIL_KEY], 
            data[Constants.USER_PASS_KEY]
        ),
        data[Constants.USER_N_PETS_KEY],
        0
    ).toJSON();
    newUser[Constants.USER_TOKEN_KEY] = serverUtils.generateToken(32);
    logger.info("Creating user : " + newUser[Constants.USER_EMAIL_KEY]);
    logger.debug("Creating user :", newUser);
    let result = await mongo.db.collection('pendingUsers').insertOne(newUser);
    if (result == null) {
        sendErrorMessage("UnknownError", req, res);
    } else {
        sendErrorMessage("Success", req, res);
        var replacements = {
            mainURL: Constants.SERVER_URL_DEFAULT,
            name: newUser[Constants.USER_NAME_KEY],
            authToken: newUser[Constants.USER_TOKEN_KEY]
       };
        readHTMLFile(__dirname + '/util/templates/validation.handlebars', function(err, html) {
            var template = handlebars.compile(html);
            var htmlToSend = template(replacements);
            mailer.sendMail({
            from: Constants.SOURCE_EMAIL_ADDRESS,
            to: newUser[Constants.USER_EMAIL_KEY],
            subject: 'Confirmação de conta pets.io',
            html: htmlToSend,
            });
        });           
    }
});

server.get(Constants.VERIFY_ACCOUNT_REQUEST, async function(req, res) {
    let query = req.query;
    let authToken = query.token;
    if (authToken == null) {
        sendErrorMessage("MalformedToken", req, res);
        return;
    }

    let auth = await mongo.db.collection('pendingUsers').findOneAndDelete({[Constants.USER_TOKEN_KEY]:authToken});
    if (auth == null) {
        sendErrorMessage("ValidationFailed", req, res);
    } else {
        auth = auth['value'];
        logger.info("Validating user : ", auth);
        delete(auth[Constants.USER_TOKEN_KEY]);
        await mongo.db.collection('users').insertOne(new userModel.User(
            auth[Constants.USER_EMAIL_KEY], 
            auth[Constants.USER_NAME_KEY],  
            auth[Constants.USER_PASS_KEY],
            auth[Constants.USER_N_PETS_KEY],
            auth[Constants.USER_N_DEVICES_KEY]
        ).toJSON());
        sendErrorMessage("Success", req, res);
    }
});

server.post(Constants.AUTH_REQUEST, async function(req, res) {
    let data = req.body;
    let authResult = await mongo.createSession(data[Constants.USER_EMAIL_KEY], data[Constants.USER_PASS_KEY]);
    logger.debug("Authentication result for " + JSON.stringify(data) + " is ", authResult)
    if (typeof(authResult) === 'string') {
        let userData = await mongo.getUser(data[Constants.USER_EMAIL_KEY]);
        delete(userData[Constants.USER_PASS_KEY]) // Remove user password from response
        delete(userData["_id"]) // Remove mongo document id
        // logger.debug("Got user data =", userData)
        userData[Constants.AUTH_TOKEN_KEY] = authResult;
        res.status(200).header("Content-Type", "application/json").send(JSON.stringify(userData));
    } else {
        logger.debug("Authentication result for " + JSON.stringify(data) + " is", authResult)
        sendErrorMessage(authResult, req, res);
    }
});

server.get(Constants.DEAUTH_REQUEST, async function(req, res) {
    let authToken = serverUtils.parseAuthToken(req.get("Authorization"));
    logger.debug("Got authorization = " + req.get("Authorization"));

    if (authToken == null) {
        sendErrorMessage("MalformedToken", req, res);
        return;
    }

    let result = await mongo.destroySession(authToken);

    if (result == null) {
        sendErrorMessage("SessionNotFound", req, res);
        return;
    }
    
    sendErrorMessage("Success", req, res);
});

server.post(Constants.RECOVER_PASS_NONCE_REQUEST, async function(req, res) {
    let data = req.body;
    logger.info("Password recovery requested for email " + data[Constants.USER_EMAIL_KEY]);
    
    let findResult = await mongo.db.collection(Constants.MONGO_COLLECTION_USERS).findOne({[Constants.USER_EMAIL_KEY]:data[Constants.USER_EMAIL_KEY]});
    if (findResult == null) {
        logger.info("Password recovery requested for email " + data[Constants.USER_EMAIL_KEY] + " not found");
        sendErrorMessage("NoSuchPrimaryKey", req, res);
        return 
    }

    let result = await mongo.generatePasswordRecoveryNonce(data[Constants.USER_EMAIL_KEY]);
    if (result == null) {
        sendErrorMessage("UnknownError", req, res);
    } else {
        sendErrorMessage("Success", req, res);
        let aux = findResult;
        aux["passwordNonce"] = result;

        var replacements = {
            mainURL: Constants.SERVER_URL_DEFAULT,
            name: findResult['name'],
            passwordNonce: findResult['passwordNonce']
       };
       readHTMLFile(__dirname + '/util/templates/recovery.handlebars', function(err, html) {
            var template = handlebars.compile(html);
            var htmlToSend = template(replacements);
            mailer.sendMail({
                from: Constants.SOURCE_EMAIL_ADDRESS,
                to: findResult['email'],
                subject: 'Recuperação de conta pets.io',
                html: htmlToSend
            });
        });
    }
});

server.post(Constants.RECOVER_PASS_REQUEST, async function(req, res) {
    let data = req.body;
    let authResult = await mongo.recoverPassword(data["token"], data[Constants.USER_PASS_KEY]);
    logger.debug("Password recovery result for " + JSON.stringify(data) + " is " + String(authResult))
    if (authResult) {
        sendErrorMessage("Success", req, res);
    } else {
        sendErrorMessage("UnknownError", req, res);
    }
});

server.get(Constants.RECOVER_PASS_REQUEST, async function(req, res) {
    sendErrorMessage("NotImplemented", req, res);
});

server.post(Constants.EVENT_TRIGGERED_REQUEST, async function(req, res) {
    let data = req.body;
    let authToken = req.token;
    

    var now = new Date();

    var filename = now.getFullYear() + (now.getMonth()+1) + now.getDate() + "_" + now.getHours() + now.getMinutes() + now.getSeconds() + ".jpg";

    let buff = new Buffer.from(data['img'], 'base64');
    fs.writeFileSync(__dirname + '/tmp/' + filename, buff);

    logger.debug(Constants.EVENT_TRIGGERED_REQUEST + " saved to " + filename);
    sendErrorMessage("Success", req, res);
});

// Listen on port
let port = process.env.PORT;
if (port == undefined) port = Constants.SERVER_PORT_DEFAULT;

if (process.argv.length > 2 &&  process.argv[2] == '--dryrun') {
    exit(0);
}

logger.info("[Server] Starting server...");
server.listen(port);
logger.info("[Server] Listening on port " + port);