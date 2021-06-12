module.exports.User = class {
    constructor(email, name, password, pic) {
        this._email    = email;
        this._name     = name;
        this._password = password;
        this._pic      = pic;
    }

    toJSON() {
        return {
            'email':this._email,
            'name':this._name,
            'password':this._password,
            'pic':this._pic
        }
    }
}