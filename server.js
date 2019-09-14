const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

const passport = require('passport');
// pass passport for configuration
require('./config/passport')(passport);


// establish connection with db
var mysql = require('mysql');
var dbconfig = require('./config/database');

var db = mysql.createConnection(dbconfig.connection);
db.connect(err => {
    if (err) {
        console.log(`Connection to MYSQL Database: ${dbconfig.database} Failed`);
    } else {
        console.log(`Connection to MYSQL Database: ${dbconfig.database} Successful`);
    }
});
db.query('USE ' + dbconfig.database);

app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// session setup
app.use(session({
    secret: 'thecowcomesoutatmidnight',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

app.post('/login', passport.authenticate('local-login', {
    failureRedirect: '/login'
}));

app.post('/signup', passport.authenticate('local-signup', {
    failureRedirect: '/signup'
}));

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

// Route to create contact
app.post('/addcontact', ({user: {userID: user_id}, body: {first_name, last_name, phone_number, email, favorite, group_id}}, res) => {
    let sql = `INSERT INTO contact(first_name, last_name, phone_number, email, favorite, group_id, user_id)
    VALUES(?,?,?,?,?,?,?)`;
    db.query(sql, [first_name, last_name, phone_number, email, favorite, group_id, user_id], (err, result) => {
        if (err) {
          res.status(500).send('Internal Server Error.');
        } else {
            console.log("Contact successfully created");
            res.sendStatus(200);
        }
    });
});

// Route to get current user's contacts
app.get('/contacts', ({user: {userID: user_id}} , res) => {
    const sql = 'SELECT * FROM contact where user_id = ?;';
    db.query(sql, [user_id], (err, result) => {
        if (err) {
            res.status(500).send('Internal Server Error.')
        } else {
            res.status(200).send(result);
        }
    });
}); 

// Route check auth middleware
function isAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    // if not valid user session, go to login page
    res.redirect('/login');
}

app.listen(PORT, err => {
    if (err) {
        console.log("Port Connection Unsuccessful");
    } else {
        console.log(`Listening on port ${PORT}`);
    }
});
