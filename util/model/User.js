const Constants = require("../Constants");

module.exports.User = class {
    constructor(email, name, password, numberOfPets, numberOfDevices) {
        this._email    = email;
        this._name     = name;
        this._password = password;
        this._pets     = numberOfPets;
        this._devices  = numberOfDevices;
    }

    toJSON() {
        return {
            [Constants.USER_EMAIL_KEY]:this._email,
            [Constants.USER_NAME_KEY]:this._name,
            [Constants.USER_PASS_KEY]:this._password,
            [Constants.USER_N_PETS_KEY]:this._pets,
            [Constants.USER_N_DEVICES_KEY]:this._devices
        }
    }
}