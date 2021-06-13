// Requests
// -- API
// -- Account
module.exports.CREATE_ACCOUNT_REQUEST      = "/createAccount";
module.exports.VERIFY_ACCOUNT_REQUEST      = "/verifyAccount";
module.exports.AUTH_REQUEST                = "/auth";
module.exports.DEAUTH_REQUEST              = "/deauth";
module.exports.RECOVER_PASS_NONCE_REQUEST  = "/recoverPasswordNonce";
module.exports.RECOVER_PASS_REQUEST        = "/recoverPassword";
module.exports.EVENT_TRIGGERED_REQUEST     = "/eventTriggered";

// Scripts
module.exports.SCRIPT_PATH = "script/"

// Log storage
module.exports.LOG_STORAGE_PATH = "log/";

// Error data
module.exports.SCRIPT_ERRORS_PATH   = module.exports.SCRIPT_PATH + "errorCodes.json";

// Localization defaults
module.exports.DEFAULT_LOCALE = "en-us";

// Mailer data
module.exports.SOURCE_EMAIL_ADDRESS = "pets.io.tcc@gmail.com";
module.exports.SOURCE_EMAIL_SERVICE = "gmail";
module.exports.SOURCE_EMAIL_HOST    = "smtp.gmail.com";

// Mongo keys
module.exports.USER_NAME_KEY      = "UserName";
module.exports.USER_TOKEN_KEY     = "UserToken";
module.exports.USER_N_PETS_KEY    = "UserNPets";
module.exports.USER_N_DEVICES_KEY = "UserNDevices";
module.exports.USER_EMAIL_KEY     = "UserEmail";
module.exports.USER_PASS_KEY      = "UserPass";
module.exports.USER_TIMESTAMP_KEY = "Timestamp";

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
module.exports.SERVER_URL_DEFAULT = "https://pets-io.herokuapp.com"
