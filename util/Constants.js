// Requests
// -- API
// -- Account
module.exports.CREATE_ACCOUNT_REQUEST      = "/createAccount";
module.exports.VERIFY_ACCOUNT_REQUEST      = "/verifyAccount";
module.exports.AUTH_REQUEST                = "/auth";
module.exports.DEAUTH_REQUEST              = "/deauth";
module.exports.RECOVER_PASS_NONCE_REQUEST  = "/recoverPasswordNonce";
module.exports.RECOVER_PASS_REQUEST        = "/recoverPassword";

// Scripts
module.exports.SCRIPT_PATH = "script/"

// Log storage
module.exports.LOG_STORAGE_PATH = "log/";

// Error data
module.exports.SCRIPT_ERRORS_PATH   = module.exports.SCRIPT_PATH + "errorCodes.json";

// Localization defaults
module.exports.DEFAULT_LOCALE = "en-us";

// Mailer data
module.exports.SOURCE_EMAIL_ADDRESS = "pets.io@gmail.com";
module.exports.SOURCE_EMAIL_SERVICE = "gmail";
module.exports.SOURCE_EMAIL_HOST    = "smtp.gmail.com";

// Mongo keys
module.exports.USER_PRIMARY_KEY  = "email"
module.exports.USER_PASSWORD_KEY = "password"
module.exports.AUTH_TOKEN_KEY    = "authToken"
module.exports.TIMESTAMP_KEY     = "timestamp"
module.exports.USER_NAME_KEY     = "name"

// Authentication info
module.exports.AUTH_TOKEN_LENGTH = 64;
module.exports.AUTH_TOKEN_TYPE = "Bearer";
module.exports.AUTH_TOKEN_NAME = module.exports.AUTH_TOKEN_TYPE + " ";

// Mongo collections
module.exports.MONGO_COLLECTION_USERS = "users";
module.exports.MONGO_COLLECTION_SESSIONS = "sessions";
module.exports.MONGO_COLLECTION_PENDING_USERS = "pendingUsers";
module.exports.MONGO_COLLECTION_PENDING_RECOVER_PASS = "passwordNonces";

module.exports.SERVER_PORT_DEFAULT = 8080
module.exports.SERVER_URL_DEFAULT = "http://localhost:"+module.exports.SERVER_PORT_DEFAULT

module.exports.SERVER_URL_DEPLOY = "https://pets-io.herokuapp.com"

