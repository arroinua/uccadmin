var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
var UserSchema = new Schema({
    email: String,
    name: String,
    password: String
}, {collection: 'users'});

UserSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    bcrypt.genSalt(10, function(err, salt) {
        if (err) throw err;

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) throw err;
            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

module.exports = mongoose.model('User', UserSchema);

