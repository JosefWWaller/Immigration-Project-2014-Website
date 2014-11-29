var express = require("express"),
    app = express(),
    formidable = require('formidable'),
    util = require('util')
    fs   = require('fs-extra'),
    qt   = require('quickthumb');
    http = require('http');

// Use quickthumb
app.use(qt.static(__dirname + '/'));


var fs = require ('fs-extra');
var hbs = require ('hbs');

var bodyParser = require('body-parser');
var session = require('cookie-session');


app.use(bodyParser.json({
  extended: true
}));
//Require Stuff

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
app.get('/login', function (req,res){
	if (req.session.loggedin){
		req.session.loggedin = null;
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

//Functions
app.get('/posts', function (req,res){
	fs.readdir('posts', function (err,data){
		if (err) throw err;
		posts = [];
		data.forEach(function (file){
			content = fs.readFileSync('posts/'+file,{encoding: 'utf8'});
			toPush = content;
			posts.push(toPush);
		})
		toSend = JSON.stringify(posts);
		res.send(toSend);
	})
})
app.post('/newcomment', function (req,res){
	if (!req.session.loggedin){
		res.send('login');
	}else{
		console.log(req);
		received = {"file":req.body.file,"content":req.body.content};
		read = fs.readFileSync('posts/'+received.file,{encoding: 'utf8'});
		post = JSON.parse(read);
		object = {"user":req.session.name,"character":req.session.character,"content":received.content,"image":req.session.image}
		comments = post.comments
		if (comments == false){
			comments = [];
		}
		comments.push(object);
		toSave = {"title":post.title,"date":post.date,"content":post.content,"image":post.image,"comments":comments}
		stringToSave = JSON.stringify(toSave);
		fs.writeFileSync('posts/'+received.file, stringToSave, 'utf8');
	}
})

app.get('/tba',function (req,res){
	fs.readdir ('userinfo', function (err,data){
		if (err) throw err;
		toSend = [];
		data.forEach(function (file){
			read = fs.readFileSync('userinfo/'+file, {encoding: 'utf8'});
			user = JSON.parse(read);
			if (!user.approved){
				user.file = file;
				toPush = JSON.stringify(user);
				toSend.push(toPush);
			}
		})
		stringToSend = JSON.stringify(toSend);
		res.send(stringToSend);
	})
})
app.post('/approveaccount', function (req,res){
	i = req.body.i;
	recFile = req.body.file;
	fs.readdir('userinfo', function (err,data){
		if (err) throw err;
		data.forEach(function (file){
			if (file==recFile){
				read = fs.readFileSync('userinfo/'+file,{encoding:'utf8'});
				userinfo = JSON.parse(read);
				userinfo.approved = true;
				toSave = JSON.stringify(userinfo);
				fs.writeFileSync('userinfo/'+file,toSave,'utf8');
			}
		})
		res.send("Received");
	})
})

app.post('/postpic', function (req,res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    // res.writeHead(200, {'content-type': 'text/plain'});
    // res.end(util.inspect({fields: fields, files: files}));
  });

  form.on('end', function(fields, files) {
    /* Temporary location of our uploaded file */
    var temp_path = this.openedFiles[0].path;
    /* The file name of the uploaded file */
    var file_name = this.openedFiles[0].name;
    /* Location where we want to copy the uploaded file */
    var new_location = 'public/images/';

    fs.copy(temp_path, new_location + file_name, function(err) {  
      if (err) {
        console.error(err);
      } else {
        res.redirect('/index');
      }
    });
  });
})
function Resize () {
	require('lwip').open('public/images/exampleimage.jpg', function (err,data){
    	if (err) throw err;
    	image.batch()
    	.scale(80,function (err,image){
    		if (err) throw err;
    	})
    	.writeFile('public/image/asdf.jpg', function (err){

    	})
    })
}

app.post('/userpic', function (req, res){
	
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files) {
    // res.writeHead(200, {'content-type': 'text/plain'});
    // res.end(util.inspect({fields: fields, files: files}));
	});

	form.on('end', function(fields, files) {
    /* Temporary location of our uploaded file */
    var temp_path = this.openedFiles[0].path;
    /* The file name of the uploaded file */
    var file_name = this.openedFiles[0].name;
    /* Location where we want to copy the uploaded file */
    var new_location = 'public/images/userpics/';

    fs.copy(temp_path, new_location + file_name, function(err) {  
      if (err) {
        console.error(err);
      } else {
        //Resize();
        res.redirect('/index');
      }
    });
  });
})

app.post('/newpost', function (req,res){
	received = {"title":req.body.title,"date":req.body.date,"content":req.body.content,"image":req.body.image,"comments":false};
	toSave = JSON.stringify(received);
	backUnixTime = 1000000000000000-(new Date).getTime();
	fs.writeFileSync('posts/'+backUnixTime+'.json',toSave,'utf8');
	res.send('Received');
})

app.post('/register', function (req,res){
	newAccount = {'name':req.body.name, 'character':req.body.character,'username':req.body.username,'password':req.body.password,'image':req.body.image,'approved':false,'admin':req.body.code};
	toReturn = {};
	fs.readdir('userinfo',function (err,data){
		if (err) throw err;
		toReturn.name = true;
		toReturn.character = true;
		toReturn.password = true;
		toReturn.username = true;
		data.forEach(function (file){
			read = fs.readFileSync('userinfo/'+file,{encoding: 'utf8'});
			account = JSON.parse(read);
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
			if (newAccount.admin == 59053427){
				console.log("Admin");
				newAccount.admin = true;
				newAccount.approved = true;
				req.session.username = newAccount.username;
				req.session.name = newAccount.name;
				req.session.character = newAccount.character;
				req.session.loggedin = true;
				console.log(req.session.loggedin);
			}else{
				newAccount.admin=false;
			}
			toSave = JSON.stringify(newAccount);
			unixTime = (new Date).getTime();
			fs.writeFileSync('userinfo/'+unixTime+'.json', toSave, 'utf8');
			console.log(req.session.loggedin);
		}
		res.send(toSend);
	})
})

app.post('/checkuser', function (req,res){
	received = {'username':req.body.username,'password':req.body.password}
	responce = 'false';
	fs.readdir('userinfo',function (err,data){
		if (err) throw err;
		data.forEach(function(file){
			read = fs.readFileSync('userinfo/'+file,{encoding: 'utf8'});
			account = JSON.parse(read);

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
					console.log("Image : "+req.session.image+" with file "+file);
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
	console.log(req.session.loggedin);
	if (req.session.loggedin){
		if (req.session.admin){
			object = {"name":req.session.name,"admin":'true'}
			toSend = JSON.stringify(object);
			res.send(toSend);
		}else{
			object = {"name":req.session.name}
			toSend = JSON.stringify(object);
			res.send(toSend);
		}
	}else{
		res.send({'name':'false'});
	}
})
app.get('/allposts', function (req,res){
	fs.readdir('posts', function (err,data){
		console.log(data);
		toSend = [];
		data.forEach(function (file){
			read = fs.readFileSync('posts/'+file,{encoding: 'utf8'});
			post = JSON.parse(read);
			if (post.comments){
				comments = [];
				post.comments.forEach(function (file){
					comments.push(file);
				})
			}else{
				comments = false;
			}
			stringcom = JSON.stringify(comments);
			if (post.comments){
				object = {'file':file,'title':post.title,'date':post.date,'content':post.content,'image':post.image,'comments':stringcom};
			}else{
				object = {'file':file,'title':post.title,'date':post.date,'content':post.content,'image':post.image,};
			}
			toSend.push(JSON.stringify(object));
		})
		res.send(toSend);	
	})
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
	// else{
	// 	console.log(since);
	// }
	//Records time for next check
	req.session.active = ((new Date).getTime())/1000;
	//Sends responce to avoid error on client side. I know it's terrible, I'll fix it later
	res.send('Why are you reading this?');
})

app.use(express.static(__dirname+'/public'));
var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});