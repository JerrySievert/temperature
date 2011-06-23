(function() {
    var mime = require("mime");
    var fs   = require("fs");
    require("./polyfills/string");
    require("date-utils");
    
    var WebUtils = function() {
        this.fourohfour = { "Content-Type": "text/plain", "body": "404 Error" };
        this.logFile;
    };

    WebUtils.prototype.parseHost = function(headers) {
        var parts = headers.host.split(":");

        return ret = {
            "host": parts[0],
            "port": (parts.length > 1 ? parts[1] : 80)
        };
    };

    WebUtils.prototype.openLog = function(filename) {
        this.logFile = fs.openSync(filename, 'a');
    };
    
    WebUtils.prototype.closeLog = function() {
        if (this.logFile !== undefined) {
            fs.closeSync(this.logfile);
            this.logFile = undefined;
        }
    };

    // return a static html/css file or 404
    WebUtils.prototype.handleFile = function(request, response, path) {
        var self = this;
        fs.stat(path,
        function(err) {
            if (err) {
                self.handle404(request, response);;
            } else {
                fs.readFile(path,
                function(err, data) {
                    response.writeHead(200, {
                        'Content-Type': mime.lookup(path)
                    });
                    response.end(data);
                    self.log(request, 200, data.length);
                });
            }
        });
    }

    // 404 error
    WebUtils.prototype.handle404 = function(request, response) {
        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.end("404 Error");
    }
    
    // replace with stack based implementation for better handling of
    // parents, allow for .. to work within the path, but not the base
    WebUtils.prototype.path = function(base, file) {
        var clean_file = file.replace(/\.\.\//g, "");

        return base + clean_file;
    }
    

    WebUtils.prototype.log = function(request, status, length) {
        if (this.logFile === undefined) {
            return;
        }

        var now = new Date();
        var timestamp = now.toCLFString();

        var data = request.connection.remoteAddress + " - - [" + timestamp + "] \"" +
                   request.url + "\" " + status + " " + length + " \"" + request.headers['referer'] + "\" \"" +
                   request.headers['user-agent'] + "\"\n";

        fs.writeSync(this.logFile, data);
    }

    exports.WebUtils = new WebUtils();
})();