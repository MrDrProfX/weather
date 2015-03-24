if (process.argv.length != 3)
{
    console.log("Usage: sudo server.js port");
    console.log("you gave " + process.argv.length + " args");
    return;
}

var port = process.argv[2];

var fs = require('fs');
var http = require('http');
var url = require('url');
var mongodb = require('mongodb');
var ROOT_DIR = "cities.dat.txt";
var server = http.createServer(function (req, res)
{
        var urlObj = url.parse(req.url, true, false);
        var pathname = urlObj.pathname;
        
        if (pathname.indexOf("comment") != -1)
        {
            console.log("comment route");
            
            if (req.method == "POST")
            {
                console.log("POST comment route");

                var jsonData = "";
                req.on('data', function(chunk)
                {
                    jsonData += chunk;
                });
                
                req.on('end', function()
                {
                    var reqObj = JSON.parse(jsonData);
                    console.log(reqObj);
                    console.log("Name: " + reqObj.Name);
                    console.log("Comment: " + reqObj.Comment);

                    // add data to database
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
            }
            else if (req.method == "GET")
            {
                console.log("GET comments route");

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
            }
        }
        else if (pathname.indexOf("getcity") != -1) // serve cities list
        {
            console.log("get city route");
            fs.readFile(ROOT_DIR, function (err,data)
            {
                if (err)
                {
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
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
        }
        else // serve static file
        {
            console.log("static file route");

            var filename = "html";
            filename += urlObj.pathname;

            if (urlObj.pathname.length == 1)
            {
                res.writeHead(400);
                res.end("<html>400 pathname empty</html>");
                return;
            }

            fs.exists(filename, function(exists)
            {
                if (!exists)
                {
                    res.writeHead(404);
                    res.end("<html>404 file doesn't exist</html>");
                    return;
                }
                //console.log('serving ' + filename);
                var strm = fs.createReadStream(filename);
                strm.pipe(res);
            });
        }
});

server.on('error', function(e)
{
    console.log('server error: ' + e);
})

server.listen(port);
