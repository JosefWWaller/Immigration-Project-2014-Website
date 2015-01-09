var express = require("express"),
    app = express(),
    formidable = require('formidable'),
    util = require('util')
    fs   = require('fs-extra'),
    qt   = require('quickthumb');
    http = require('http');

var mongoose = require('mongoose');
var async = require('async');
var uristring =
	process.env.MONGOLAB_URI ||
	process.env.MONGOHQ_URL ||
	'mongodb://localhost/immigrationproject';
mongoose.connect(uristring, function (err){
	if (err) throw err;
});
var grid = require('gridfs-stream');
var gridfs = grid(mongoose.connection.db, mongoose.mongo);

// Detect production (on heroku)
var isDevelopment = process.env.NODE_ENV != "production";

// Use quickthumb
app.use(qt.static(__dirname + '/'));


var fs = require ('fs-extra');
var hbs = require ('hbs');

var bodyParser = require('body-parser');
var session = require('cookie-session');


app.use(bodyParser.json({
  extended: true
}));

// Models
var Post = mongoose.model('Post', {
	title: String,
	author: String,
	content: String,
	date: Date,
	image: String
});
var Comment = mongoose.model('Comment', {
	user: String,
	character: String,
	content: String,
	image: String,
	post_id: mongoose.Schema.Types.ObjectId
});
var UserInfo = mongoose.model('UserInfo', {
	name : String,
	character : String,
	username : String,
	password : String,
	image : String,
	bio : String,
	approved : Boolean,
	admin : Boolean
});

// Read partials from partials folder and add them to handlebars
var partialsDir = __dirname + '/views/partials/';

var filenames = fs.readdirSync(partialsDir);

filenames.forEach(function (filename) {
  var matches = /^([^.]+).hbs$/.exec(filename);
  if (!matches) {
    return;
  }
  var name = matches[1];
  var template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
  hbs.registerPartial(name, template);
});


app.set('view engine', 'html');
app.engine('html',require('hbs').__express);
app.set('views', __dirname + '/views');
app.set('trust proxy', 1)
app.use(session({
	loggedin: {
		path: '/',
		httpOnly: true,
		maxAge: null,
		expires: false
	},
	secret:'siriusTHEamazingDOG1',
}));

//Pages
app.get('/index', function (req,res){
	res.render('index.html');
})
app.get('/edit', function (req,res){
	res.render('edit.html');
})
app.get('/login', function (req,res){
	if (req.session.loggedin){
		req.session.loggedin = null;
		req.session.name = null;
		req.session.admin = null;
		res.redirect('/index');
	}else{
		res.render('login.html');
	}
})
app.get('/', function (req,res){
	res.redirect('/index');
})
app.get('/post', function (req,res){
	if (req.session.loggedin){
		res.render('post.html');
	}else{
		res.redirect('/login');
	}
})
app.get('/all', function (req,res){
	res.render('all.html');
})
app.get('/approve', function (req,res){
	if (req.session.admin){
		res.render('approve.html');
	}else{
		res.redirect('/index');
	}
})
app.get('/me', function(req,res){
	if (req.session.loggedin){
		res.redirect('/profile/:'+req.session.name);
	}
})

//Functions

app.get('/profile/:name', function (req,res){
	name = (req.params.name).replace(':',"");
	toReturn = {
		"name":name
	}
	res.render("profile.html",toReturn)
})
app.get('/edituser/:name', function (req,res){
	name = req.params.name;
	if (name==req.session.name){
		res.render('edituser.html')
	}else{
		res.send("Not logged in"+req.session.name+ " "+name)
	}
})
app.post('/edituserinfo', function (req,res){
	UserInfo.find({"username":req.body.user,"password":req.body.pass}).exec(function (err,users){
		if (users.length>1){
			res.send("Error! Contact Josef ASAP or try logging in again!")
		}
		if (users.length == 0){
			res.send(false);
			console.log("ERROR ERROR user :"+req.body.user +" pass :"+req.body.pass)
		}else{
			user = users[0];
			name = user.name;
			Post.find({"author":name}).exec(function (err,posts){
				posts.forEach(function (post){
					if (post.author){
						post.author = req.body.name;
					}
					post.save(function (err){
						if (err) throw err;
					})
				})
			})
			user.name = req.body.name;
			user.character = req.body.char;
			user.bio = req.body.bio;
			req.session.name = req.body.name;
			req.session.character = req.body.char;
			user.save(function (err){
				if (err) throw err;
			})
			res.send(user.name)
		}
	})
})
app.get('/user', function (req,res){
		UserInfo.find({"name":req.session.name}).exec(function (err,users){
			if (users.length == 0 || users.length > 1){
				res.send("ERROR. Please contact Josef Immediantly, or try logging in again. Values {/n req,session.name : "+req.session.name+"/n users.length : "+users.length+"/n}");
			}else{
				user = users[0];
				object = {
					"name":user.name,
					"char":user.character,
					"bio":user.bio
				}
				if (object.bio==null){
					object.bio = "No Bio";
				}
				console.log(object);
				res.send(object);
			}
		})
})
app.get('/users/:name', function (req,res){
	name = (req.params.name).replace(':',"");
	UserInfo.find({"name" : name}).exec(function (err,users){
		if (users.length != 1){
			console.log("ERROR 101");
			res.send("Error! Please contact Josef Immediantly. Length : "+users.length+". Name : "+name);
			return;
		}
		user = users[0];
		user.password = null;
		user.username = null;
		Post.find({"author" : name}).exec(function (err,posts){
			toReturn = {
				"userInfo":user,
				"posts":posts
			}
			if (req.session.name == name){
				toReturn.isUser = true;
			}else{
				toReturn.isUser = false;
			}
			toSend = JSON.stringify(toReturn);
			res.send(toSend);
		})
	})
})
app.get('/allposts', function (req,res){
	Post.find().sort('-date').exec(function (err, posts){
		allFunc = [];
		posts.forEach(function (post) {

			var postId = post._id;
			commentsFunction = function (callback) {
				Comment.find({ "post_id": postId }).exec(function (err, data){
					if (err) {
						callback(err, null);
					} else {
						postObject = {
							"post": post,
							"comments": data
						};
						callback(null, postObject);
					}
				})
			}
			allFunc.push(commentsFunction);
		})
		async.parallel(allFunc, function (err, datas) {
			toSend = JSON.stringify(datas);
			res.send(toSend);
		});
	})
})
app.post('/newcomment', function (req,res){
	if (!req.session.loggedin){
		res.send('login');
	}else{
		received = {
			"post_id":req.body.id,
			"content":req.body.content
		};
		object = {
			"user":req.session.name,
			"character":req.session.character,
			"content":received.content,
			"image":req.session.image,
			"post_id":received.post_id
		}
		Comment.create(object, function (err, post) {
			if (err) throw err;
			res.send(JSON.stringify(object));
		});
	}
})

app.get('/tba',function (req,res){
	UserInfo.find({ approved: false }).exec(function (err,users){
		if (err) throw err;
		stringToSend = JSON.stringify(users);
		res.send(stringToSend);
	})
})
app.post('/approveaccount', function (req,res){
	userId = req.body.file;
	UserInfo.findById(userId, function (err, user) {
		if (err) throw err;
		user.approved = true;
		user.save(function (err) {
			if (err) throw err;
			res.send("Received");
		});
	})
})

app.get('/db_images/:name', function (req, res) {
	var readstream = gridfs.createReadStream({
	  filename: req.params.name
	});

	readstream.on('error', function (err) {
	  res.sendStatus(404);
	  res.end();
	});

	readstream.pipe(res);
});

app.post('/postpic', function (req,res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {

    /* Temporary location of our uploaded file */
    var temp_path = files['upload'].path;
    /* The file name of the uploaded file */
    var file_name = files['upload'].name;

    var postId = fields['post_id'];
    Post.findById(postId, function (err, post) {
    	if (err) throw err;

	    var filename = 'post_image_' + require('randomstring').generate();
	    var writestream = gridfs.createWriteStream({ filename: filename });
	    writestream.on('close', function (file) {
	    	// Set the image property on the post
	    	post.image = filename;
	    	post.save(function (err) {
		    	res.redirect('/index');
	    	});
	    });
	    fs.createReadStream(temp_path).pipe(writestream);
    });

  });
})
app.post('/userpic', function (req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {

    /* Temporary location of our uploaded file */
    var temp_path = files['upload'].path;
    /* The file name of the uploaded file */
    var file_name = files['upload'].name;

    var userId = fields['user_id'];
    console.log(form);
    UserInfo.findById(userId, function (err, user) {
    	if (err) throw err;

	    var filename = 'user_image_' + require('randomstring').generate();
	    var writestream = gridfs.createWriteStream({ filename: filename });
	    writestream.on('close', function (file) {
	    	// Set the image property on the post
	    	user.image = filename;
	    	user.save(function (err) {
	    		if (err) throw err;
		    	res.redirect('/index');
	    	});
	    });
	    fs.createReadStream(temp_path).pipe(writestream);
    });

  });
})

app.post('/newpost', function (req,res){
	if (req.session.loggedin){
		received = {
			"title":req.body.title,
			"author":req.session.name,
			"date":req.body.date,
			"content":req.body.content,
			"image":req.body.image
		};
		Post.create(received, function (err, post) {
			if (err) throw err;
			res.send(post._id);
		});
	}else{
		res.redirect('/login');
	}
})

app.post('/register', function (req,res){
	newAccount = {
		'name':req.body.name,
		'character':req.body.character,
		'username':req.body.username,
		'password':req.body.password,
		'image':req.body.image,
		'approved':false,
		'admin':req.body.code
	};
	if ((newAccount.name).slice(-1)==" "){
		newAccount.name = newAccount.name.slice(0,-1);
		console.log("Sliced to "+newAccount.name+"!");
	}else{
		console.log("No slicing");
	}
	toReturn = {};
	UserInfo.find().exec(function (err,data){
		if (err) throw err;
		toReturn.name = true;
		toReturn.character = true;
		toReturn.password = true;
		toReturn.username = true;
		data.forEach(function (account){
			if (account.name == newAccount.name){
				toReturn.name = false;
			}
			if (account.character == newAccount.character){
				toReturn.character = false;
			}
			if (account.username == newAccount.username){
				toReturn.username = false;
			}
			if (account.password == newAccount.password){
				toReturn.password = false;
			}
		})
		toSend = JSON.stringify(toReturn);
		if (toReturn.username && toReturn.password && toReturn.name && toReturn.character){
			if (newAccount.admin == 59053427 || (isDevelopment && newAccount.admin == 1)){
				newAccount.admin = true;
				newAccount.approved = true;
				req.session.username = newAccount.username;
				req.session.name = newAccount.name;
				req.session.image = newAccount.image;
				req.session.character = newAccount.character;
				req.session.loggedin = true;
			}else{
				newAccount.admin=false;
			}
			UserInfo.create(newAccount, function (err, user) {
				if (err) throw err;
			})
		}
		toSend = JSON.stringify(toReturn);
		console.log(toSend);
		res.send(toSend);
	})
})

app.post('/checkuser', function (req,res){
	received = {'username':req.body.username,
	'password':req.body.password
	}
	responce = 'false';
	UserInfo.find().exec(function (err,users){
		if (err) throw err;
		users.forEach(function (account){

			if (account.username == received.username && account.password == received.password){
				if (account.approved){
					if (account.admin == true){
						req.session.admin = true;
					}
					responce = true;
					req.session.loggedin = true;
					req.session.username = account.username;
					req.session.character = account.character;
					req.session.image = account.image;
					req.session.name = account.name;
				}else{
					responce = 'notappr';
				}
			}
		})
		res.send(responce);
	})
})
app.get('/headeruser', function (req,res){
	if (req.session.loggedin){
		if (req.session.admin){
			object = {
				"name":req.session.name,
				"admin":'true'
			}
			toSend = JSON.stringify(object);
			res.send(toSend);
		}else{
			object = {
				"name":req.session.name
			}
			toSend = JSON.stringify(object);
			res.send(toSend);
		}
	}else{
		res.send({'name':'false'});
	}
})

//Checks for the browser closed
//by waiting for a responce that
//is sent by the client every 5
//seconds. If the message is
//recieved over 30 seconds since
//the last, the req.session is
//restarted
app.post('/check', function (req,res){

	//If this is the first time entering, sets active to time
	if (!req.session.active){
		req.session.active = ((new Date).getTime())/1000;
	}

	//Gets the time since the last time
	since = ((new Date).getTime())/1000 - req.session.active;
	//Checks if it has been longer than 30 seconds
	if (since > 30){
		//Resets the session
		req.session.loggedin = null;
		req.session.username = null;
		req.session.admin = null;
		req.session.name = null;
		req.session.character = null;
	}
	//Records time for next check
	req.session.active = ((new Date).getTime())/1000;
	//Sends responce to avoid error on client side. I know it's terrible, I'll fix it later
	res.send('Why are you reading this?');
})

app.use(express.static(__dirname+'/public'));
var server = app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port %d', server.address().port);
});