module.exports.User = class {
    constructor(email, name, password, numberOfPets) {
        this._email    = email;
        this._name     = name;
        this._password = password;
        this._pets     = numberOfPets;
    }

    toJSON() {
        return {
            'email':this._email,
            'name':this._name,
            'password':this._password,
            'numberOfPets':this._pets
        }
    }
}