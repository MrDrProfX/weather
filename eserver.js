var express = require('express');
var basicAuth = require('basic-auth-connect');
var mongodb = require('mongodb');
var bodyParser = require('body-parser');
var https = require('https');
var http = require('http');
var fs = require('fs');
var url = require('url');
var app = express();
var ROOT_DIR = "cities.dat.txt";

var auth = basicAuth(function(user, pass)
{
    return ((user === 'cs360') && (pass === 'test'));
});

var options =
{
    host: '127.0.0.1',
    key: fs.readFileSync('ssl/server.key'),
    cert: fs.readFileSync('ssl/server.crt')
};

http.createServer(app).listen(80);
https.createServer(options, app).listen(443);

app.get('/', function (req, res)
{
    res.send("Get Index");
});

app.use('/', express.static('./html', {maxAge: 60*60*1000}));

app.get('/getcity', function (req, res)
{
    var urlObj = url.parse(req.url, true, false);
    console.log("In getcity route");

    fs.readFile(ROOT_DIR, function (err,data)
    {
        if (err)
        {
            res.writeHead(404);
            res.end(JSON.stringify(err));
            throw err;
            return;
        }

        var cities = data.toString().split('\n');
        var typed = urlObj.query["q"];

        if (!typed)
        {
            res.writeHead(400);
            res.end("<html>400 error parsing city substring</html>");
            return;
        }

        var result = [];
        for (var i=0; i<cities.length; i++)
        {
            if (cities[i].substring(0,typed.length) == typed)
                result.push({"city":cities[i]});
        }

        res.writeHead(200);
        res.end(JSON.stringify(result));
    });
});

app.get('/comment|/clear', function(req, res)
{
    console.log("GET comments route");

    var urlObj = url.parse(req.url, true, false);
    var pathname = urlObj.pathname;

    var MongoClient = mongodb.MongoClient;
    MongoClient.connect("mongodb://localhost/weather", function(err, db)
    {
        if (err)
            throw err;
        db.collection("comments", function(err, comments)
        {
            if (err)
            throw err;
            if (pathname.indexOf("clear") != -1)
            {
                comments.remove({}, function(err, numberRemoved)
                {
                    console.log("removed "+numberRemoved+" documents");
                });
            }

            comments.find(function(err, items)
            {
                if (err)
                    throw err;
                items.toArray(function(err, itemsArr)
                {
                    if (err)
                        throw err;
                    console.log("Document Array: ");
                    console.log(itemsArr);

                    res.writeHead(200);
                    res.end(JSON.stringify(itemsArr));
                });
            });
        });
    });
});

app.post('/comment', bodyParser(), auth, function(req, res)
{
    console.log("POST comment route");
    var jsonData = JSON.stringify(req.body);

    console.log("my json: " + jsonData);
    var reqObj = JSON.parse(jsonData);
    console.log(reqObj);
    console.log("Name: " + reqObj.Name);
    console.log("Comment: " + reqObj.Comment);

    //add data to database
    var MongoClient = mongodb.MongoClient;
    MongoClient.connect("mongodb://localhost/weather", function(err, db)
    {
        if (err)
            throw err;
        db.collection('comments').insert(reqObj, function(err, records)
        {
            if (err)
                console.log(err);
            console.log("Record added as "+records[0]._id);
            res.writeHead(200);
            res.end();
        });
    });
});
