const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const Constants = require("../util/Constants.js");
const logger = require("../util/Logger.js").logger;
const serverUtils = require("../util/Util.js");
const {spawn} = require('child_process');

// Environment variables
require('dotenv').config({path: __dirname + '/.env'});

logger.info("Starting mongo helper...");

let _dbUrl;
if (serverUtils.isLocalEnvironment) {
    _dbUrl = "mongodb://"+process.env.MONGO_URL;
} else {
    _dbUrl = "mongodb+srv://"+process.env.MONGO_USER+":"+process.env.MONGO_PASS+"@"+process.env.MONGO_URL+"/"+process.env.MONGO_DB_NAME+"?retryWrites=true&w=majority";
}
const dbUrl = _dbUrl;

// Mongo db client
const client = new MongoClient(dbUrl, { useUnifiedTopology: true });

const spawnMongod = () => {
    let mongodb_path = process.env.MONGO_DBPATH;
    if (mongodb_path[0] == '.') { // Relative path
        mongodb_path = __dirname + mongodb_path.substr(1);
    }
    logger.debug("Mongodb path set as [" + mongodb_path + "]");
    module.exports._mongodProcess = spawn(
        process.env.MONGO_BIN,
        [
            "--dbpath="+mongodb_path
        ]
    );

    // Collect data from script
    module.exports._mongodProcess.stdout.on('data', function (data) {
        for (line of String(data).split('\n').slice(0, -1))
            logger.debug('[mongod/stdout] ' + line);
    });

    // Collect error data from script (for debugging)
    module.exports._mongodProcess.stderr.on('data', function (data) {
        for (line of String(data).split('\n').slice(0, -1))
            logger.error('[mongod/stderr] ' + line);
    });

    // Handle mongod process exit
    module.exports._mongodProcess.on('close', function (code) {
        logger.warn('[mongod/close] ' + code);
        if (code == 100) { // Instance already running
            logger.warn('[mongod/close] Mongod instance already running, logger is unavailable');
        }
    });

    logger.debug("Created mongod process");
}

const load = async () => {
    if (serverUtils.isLocalEnvironment) {
        logger.debug("Spawning mongo process...");
        spawnMongod();
    } else {
        logger.debug("Env is " + process.env.NODE_ENV + "; skipping mongo spawn");
    }

    let cclient = await client.connect().catch(err => {
        logger.error('Mongo load error: ' + err.message);
        logger.debug('Mongo load error: ', err);
        process.exit(1); // FIXME: find appropriate exit code (maybe client.connect error code?)
    });
    module.exports.db = cclient.db(process.env.MONGO_DB_NAME);
    logger.info("Mongo db loaded");

    /**
     * Checks for an existing session for that user
     *
     * @param user {String} Primary key identifying the user to be checked
     */
    module.exports.checkForSession = function(user) {
        let key = Constants.USER_EMAIL_KEY;
        let result = module.exports.db.collection(Constants.MONGO_COLLECTION_SESSIONS).findOne({key:user});
        if (result) {
            return true
        }
        return false
    }

    /**
     * Checks for an existing session for the given user
     *
     * @param user {String} Primary key identifying the user
     * @param password {String} Password that will be checked against the password in database
     */
    module.exports.createSession = async function(user, password) {
        // Check for correct credentials
        logger.debug("[createSession] User: " + user)
        logger.debug("[createSession] Pass: " + serverUtils.saltAndHashPassword(user, password))
      
        let result = await module.exports.db.collection(Constants.MONGO_COLLECTION_USERS).findOne({
            [Constants.USER_EMAIL_KEY]:user,
            [Constants.USER_PASS_KEY]:serverUtils.saltAndHashPassword(user, password)
        });
        if (result == null) { return serverUtils.findErrorByName("InvalidCredentials"); }

        // Check if there is not a session active for the user
        result = await module.exports.db.collection('sessions').findOne({
            [Constants.USER_EMAIL_KEY]:user
        });
        logger.debug("session already active", result);
        if (result != null) { return JSON.stringify(result); }

        let token = serverUtils.generateToken(Constants.AUTH_TOKEN_LENGTH);
        result = await module.exports.db.collection(Constants.MONGO_COLLECTION_SESSIONS).insertOne({
            [Constants.USER_EMAIL_KEY]:user,
            [Constants.USER_TOKEN_KEY]:token,
            [Constants.USER_TIMESTAMP_KEY]:Date.now()
        });
        logger.debug("Created session: " + JSON.stringify(result));
        if (result == null) { return serverUtils.findErrorByName("UnknownError"); }
        return token;
    }

    /**
     * Validate if there exists an active session with the given token
     *
     * @param token {String} Token to be authenticated
     */
    module.exports.validateSession = async function(token) {
        let result = await module.exports.db.collection(Constants.MONGO_COLLECTION_SESSIONS).findOne({[Constants.USER_TOKEN_KEY]:token});
        logger.debug("Got result", result);
        return result;
    }

    /**
     * Validate if there exists an active session with the given token for the given user
     *
     * @param token {String} Token to be authenticated
     * @param user {String} Primary key identifying the user to be checked
     */
    module.exports.validateUserSession = async function(token, user) {
        let result = await module.exports.db.collection(Constants.MONGO_COLLECTION_SESSIONS).findOne({[Constants.USER_EMAIL_KEY]:user, [Constants.USER_TOKEN_KEY]:token});
        if (result) {
            return true
        }
        return false
    }

    /**
     * Destroy an active session (deauthenticates all future calls using the provided token)
     *
     * @param token {String} Token to be de-authenticated
     */
    module.exports.destroySession = async function(token) {
        let result = await module.exports.db.collection(Constants.MONGO_COLLECTION_SESSIONS).findOneAndDelete({[Constants.USER_TOKEN_KEY]:token});
        if (result.value) {
            return result
        }
        return null
    }

    /**
     * Consults number of pets user informed during registration to send the pictures
     *
     * @param token {String} Token to be de-authenticated
     */
    module.exports.getPendingPets = async function(token) {
        let userSession = await module.exports.db.collection(Constants.MONGO_COLLECTION_SESSIONS)
            .findOne({[Constants.USER_TOKEN_KEY]:token})
        if (!userSession.value) {
            return null;
        }
        let result = await module.exports.db.collection(Constants.MONGO_COLLECTION_USERS)
            .findOne({[Constants.Constants.USER_EMAIL_KEY]:userSession.value[Constants.USER_EMAIL_KEY]});
        if (result.value) {
            return result.value[Constants.USER_PENDING_PETS_KEY];
        }
        return null
    }

    /**
     * Generate a nonce used to reset a forgotten password
     *
     * @param email {String} Email associated with the account that will reset password
     */
    module.exports.generatePasswordRecoveryNonce = async function(email) {
        let result = await module.exports.db.collection(Constants.MONGO_COLLECTION_USERS).findOne({[Constants.USER_EMAIL_KEY]:email});
        if (result == null) {
            logger.error("generatePasswordRecoveryNonce PK not found!");
            return null;
        }
        let nonce = serverUtils.generateToken(Constants.AUTH_TOKEN_LENGTH);
        result = await module.exports.db.collection(Constants.MONGO_COLLECTION_PENDING_RECOVER_PASS).insertOne({
            [Constants.USER_EMAIL_KEY]:email, 
            "passwordNonce":nonce,
            [Constants.USER_TIMESTAMP_KEY]:Date.now()
        })
        logger.debug("generatePasswordRecoveryNonce insertOne result =", result);
        return result.ops[0]["passwordNonce"];
    }

    /**
     * Reset a forgotten password using the nonce
     *
     * @param nonce {String} Nonce generated with getPasswordRecoveryNonce
     * @param newPassword {String} New password to write to database
     */
    module.exports.recoverPassword = async function(nonce, newPassword) {
        let result = await module.exports.db.collection(Constants.MONGO_COLLECTION_PENDING_RECOVER_PASS).findOneAndDelete({"passwordNonce":nonce});
        if (result.value == null) {
            return null;
        }
        let aux = result.value;
        result = await module.exports.db.collection(Constants.MONGO_COLLECTION_USERS).findOneAndUpdate(
            {[Constants.USER_EMAIL_KEY]:aux[Constants.USER_EMAIL_KEY]},
            {"$set":{[Constants.USER_PASS_KEY]:newPassword}}
        );
        return result.value;
    }

    /*
     * Get all stored data related to a user
     *
     * @param user {String} Primary key identifying the user
     */
    module.exports.getUser = async function(user) {
        // Check for correct credentials
        let result = await module.exports.db.collection(Constants.MONGO_COLLECTION_USERS).findOne({
            [Constants.USER_EMAIL_KEY]:user
        });
        logger.debug("Got user data =", result);
        if (result == null) { return serverUtils.findErrorByName("InvalidCredentials"); }
        
        return result;
    }
}

load();