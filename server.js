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
var ROOT_DIR = "cities.dat.txt";
var server = http.createServer(function (req, res)
{
        var urlObj = url.parse(req.url, true, false);
        var pathname = urlObj.pathname;
        
        if (pathname.indexOf("getcity") != -1) // serve cities list
        {
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
                console.log('serving ' + filename);
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
