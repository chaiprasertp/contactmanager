let LocalStrategy = require('passport-local').Strategy;

// load up the user model
let mysql = require('mysql');
let bcrypt = require('bcrypt-nodejs');
let dbconfig = require('./database');
let db = mysql.createConnection(dbconfig.connection);
db.connect(err => {
    if (err) {
        console.log(`Connection to MYSQL Database: ${dbconfig.database} Failed`);
    } else {
        console.log(`Connection to MYSQL Database: ${dbconfig.database} Successful`);
    }
});

db.query('USE ' + dbconfig.database);
// expose this function to our app using module.exports
module.exports = function (passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        // console.log(user);
        done(null, user.token);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        db.query("SELECT * FROM users WHERE token = ? ", [id], function (err, rows) {
            done(err, rows[0]);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================

    passport.use(
        'local-signup',
        new LocalStrategy({
                // by default, local strategy uses username and password
                usernameField: 'email',
                passwordField: 'password',
                passReqToCallback: true // allows us to pass back the entire request to the callback
            },
            function (req, email, password, done) {
                // we are checking to see if the user trying to login already exists
                db.query('SELECT * FROM users WHERE email = ?', [email], function (err, rows) {
                    if (err) {
                        console.log("ERR");
                        return done(err);
                    }
                    if (rows.length) {
                        console.log("Email:",email,"already exists");
                        return done(null, false);
                    } else {
                        // if there is no user with that username
                        // Create a json user model
                        let newUserMysql = {
                            first_name: req.body.first_name,
                            last_name: req.body.last_name,
                            email: email,
                            password: bcrypt.hashSync(password, null, null)
                        };

                        let insertQuery = 'INSERT INTO users (email, password, first_name, last_name, token) VALUES (?,?,?,?,?)';
                        db.query(insertQuery, [newUserMysql.email, newUserMysql.password, newUserMysql.first_name, newUserMysql.last_name, ""],
                            function (err, result) {
                                if (err) {
                                    done (err);
                                }
                                // Get the new User id from the db to return for serializing
                                newUserMysql.userId = result.insertId;
                                console.log("User created successfully.");
                                // Returns callback with user info to serialize user to begin session
                                delete newUserMysql.password;
                                return done(null, newUserMysql);
                            });
                    }
                });
            })
    );

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================

    passport.use(
        'local-login',
        new LocalStrategy({
                usernameField: 'email',
                passwordField: 'password',
                passReqToCallback: true // allows us to pass back the entire request to the callback
            },
            function (req, email, password, done) { // callback with email and password from our form
                // db.connect();
                db.query("SELECT * FROM users WHERE email = ?", [email], function (err, rows) {
                    if (err) {
                        return done(err);
                    }
                    if (!rows.length) {
                        console.log('Username not registered');
                        return done(null, false);
                    }

                    // If the user is already logged in then just return row again
                    // if (rows[0].token != null)
                    // {
                    //     console.log(`User ${rows[0].email} already logged in`);
                    //     delete rows[0].password;
                    //     return done(null, rows[0]);
                    // }

                    // if the user is found but the password is wrong
                    if (!bcrypt.compareSync(password, rows[0].password)) {
                        console.log(email,'tried to log in with Incorrect Password');
                        return done(null, false);

                    }
                    // login successful
                    delete rows[0].password;
                    return done(null, rows[0]);
                });
                // db.end();
            })
    );
};
