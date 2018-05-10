var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

var path = require('path');
app.use(express.static(path.join(__dirname, './static')));

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/dojosecrets');

var session = require('express-session');
app.use(session({
    secret: 'denvernuggets',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 6000000}
}))

var bcrypt = require('bcrypt');

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

// const flash = require('express-flash');
// app.use(flash());

var CommentSchema = new mongoose.Schema({
    comment: { type: String},
    commenteruserid: {type: String}
}, {timestamps: true});

var SecretSchema = new mongoose.Schema({
    secret: { type: String},
    userid: { type: String},
    comments: [CommentSchema]
}, {timestamps: true});

var UserSchema = new mongoose.Schema({
    email: { type: String},
    first_name: { type: String},
    last_name: { type: String},
    password: { type: String},
    secrets: [SecretSchema]
}, {timestamps: true });

mongoose.model('User', UserSchema);
mongoose.model('Secret', SecretSchema);
mongoose.model('Comment', CommentSchema);
var User = mongoose.model('User');
var Secret = mongoose.model('Secret');
var Comment = mongoose.model('Comment');

//root route and displays all the mongooses
app.get('/', function(req, res) {
    res.render('index');
})

app.get('/secret', function(req, res) {
    if(req.session.isloggedin == true) {
        Secret.find({}, function(err, allsecrets) {
            if(err) {
                console.log(err);
            } 
            res.render('secret', {allsecrets: allsecrets, session: req.session});
        })
    } else {
        console.log("cant access this page, you're not logged in.")
        res.redirect('/')
    }
})

app.get('/secret/:id', function(req, res) {
    Secret.find({_id: req.params.id}, function(err, thesecret) {
        if(err) {
            console.log(err);
        }
        res.render('show', {thesecret: thesecret});
    })
})

app.post('/register', function(req, res) {
    var password = req.body.password;
    var isValid = true;
    bcrypt.hash(password, 10, function(err, hash) {
        if(err) {
            console.log(err);
            res.redirect('/');
        } else {
            //query to see if the email exists
            User.findOne({email: req.body.email}, function(err, emaildup) {
                if(err) {
                    console.log(err);
                } else {
                    if(emaildup) {
                        console.log("email is already taken");
                        isValid = false;
                    } 
                    if(req.body.email.length < 6) {
                        console.log("email should be longer than 6");
                        isValid = false;
                    } 
                    if(req.body.first_name < 1) {
                        console.log("first name can't be empty");
                        isValid = false;
                    } 
                    if(req.body.last_name < 1) {
                        console.log("last name can't be empty");
                        isValid = false;
                    } 
                    if(req.body.password < 6) {
                        console.log("password should be longer than 6 characters");
                        isValid = false;
                    } 
                    if(isValid == true) {
                        var register = new User({email: req.body.email, first_name: req.body.first_name, last_name: req.body.last_name, password: hash});
                        register.save();
                        console.log("successfully registered");
                        req.session.first_name = register.first_name;
                        req.session.userid = register._id;
                        //check if the user is logged in
                        console.log("user id is " + req.session.userid);
        
                        req.session.isloggedin = true;
                        res.redirect('/secret');
                    } else {
                        //if validation fails, redirect to root route
                        res.redirect('/')  
                    }
                }
            });
        }
    })
});

app.post('/login', function(req, res) {
    User.findOne({email: req.body.email}, function(err, user){
        if(err) {
            console.log("can't login");
            res.redirect('/')
        } else {
            if(user){
                const typedpass = req.body.password;
                const hashedpass = user.password;
                bcrypt.compare(typedpass, hashedpass, function(err, correctpass) {
                    if(correctpass) {
                        console.log("you did it! logged in!");
                        req.session.first_name = user.first_name;
                        req.session.userid = user._id;
                        //check if the user is logged in
                        req.session.isloggedin = true;
                        res.redirect('/secret');
                    } else {
                        console.log("incorrect password");
                        res.redirect('/');
                    } 
                });
            } else {
                console.log("user doesnt exist");
                res.redirect('/')
            } 
        } 
    })
})

app.get('/logout', function(req, res){
    req.session.destroy();
    console.log("you successfully logged out")
    res.redirect('/')
})

app.post('/secret', function(req, res) {
    Secret.create({secret: req.body.secret, userid: req.session.userid}, function(err, data) {
        if(err) {
            console.log(err);
        } else {
            User.findOneAndUpdate({_id: req.params.id}, {$push: {secrets : data}}, function(err, data) {
                if(err) {
                    console.log(err);
                } else {
                    console.log('successfully added a new secret');
                }
            })
        }
        res.redirect('/secret')
    })
});

app.get('/secret/:id/destroy', function(req, res) {
    Secret.findByIdAndRemove({_id: req.params.id}, function(err, del) {
        if(err) {
            console.log(err);
        } else {
            console.log("successfully deleted a secret");
            res.redirect('/secret');
        }
    })
})

app.post('/secret/:id/comment', function(req, res){
    Comment.create({comment: req.body.comment, commenteruserid: req.session.userid}, function(err, data) {
        if(err) {
            console.log(err);
        } else {
            Secret.findByIdAndUpdate({_id: req.params.id}, {$push: {comments: data}}, function(err, data){
                if(err){
                    console.log(err);
                } else {
                    console.log("successfully added a comment");
                }
            })
        }
        res.redirect(/secret/+req.params.id);
    })
})

// Setting our Server to Listen on Port: 8000
app.listen(7000, function() {
    console.log("listening on port 7000");
})

