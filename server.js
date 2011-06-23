var http     = require('http');
var url      = require('url');
var qs       = require('querystring');
var redis    = require('redis');
var OAuth    = require('oAuth');
var io       = require('socket.io');

var utils    = require('./js/utils').WebUtils;
var store    = require('./js/memstore').Store;

// polyfills
require('./js/polyfills/string');
require('date-utils');

var settings = require('./settings');

// temperature information
var last_received;
var temperatures = [ ];
var collecting   = false;
var danger       = false;

// create the base webserver, set up handlers for normal files and post update
var server = http.createServer(function (request, response) {
    var parsed   = url.parse(request.url, true);
    var pathname = parsed.pathname;

    if (pathname === '/post') {
        handleDataPost(request, response);
    } else {
        if (pathname === '/') {
            pathname = 'index.html';
        }

        var file = utils.path(settings.htdocs, pathname);
        utils.handleFile(request, response, file);
    }
});

// set up log file
if (settings.logfile) {
    utils.openLog(settings.logfile);
}

// start up webserver
server.listen(settings.port, settings.host);
tweet("Server started: http://" + settings.host + ":" + settings.port + "/index.html");

// connect to redis server
var redisClient = redis.createClient();

redisClient.on("error", function (err) {
    console.log("Redis Error " + err);
});


// set up the client list to broadcast any updates to
var clients = new store();

// set up the websocket listener
var socket = io.listen(server); 
socket.on('connection', function(client) {
    // handle disconnect
    client.on('disconnect', function() {
        var sessionId = client.sessionId;
        clients.delete(sessionId);
    });
  
    client.on('message', function(payload) {
        if (payload && payload.type && payload.type === 'data') {
            var dates  = payload.dates;
            handleDateRequest(client, dates);
        }
    });
  
    clients.set(client.sessionId, {
        "sessionId": client.sessionId,
        "client": client
    });
});

// check state and update as needed
setInterval(checkState, settings.threshold);
setInterval(updateData, settings.threshold * 60);


function handleDataPost(request, response) {
    var parsed = url.parse(request.url);
    var query  = qs.parse(parsed.query);

    if (query.key !== settings.key || query.temperature === undefined) {
        response.writeHead(403, { 'Content-Type': 'text/plain' });
        response.end('403 - Sorry Charlie');
    } else  {
        if (!collecting) {
            tweet("Data collection started, temperature " + query.temperature + "ºC");
            collecting = true;
        }

        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('Ok!');

        last_received = new Date();

        var temperature = Number(query.temperature);

        temperatures.push(temperature);
        if (temperatures.length > settings.max_avg) {
            temperatures.shift();
        }

        // if there are over the average entries, check for being over maximum
        if (temperatures.length >= settings.min_avg) {
            if (!danger) {
                var total = 0;
                for (var i = temperatures.length; i > temperatures.length - settings.min_avg; i--) {
                    total += temperatures[i - 1];
                }
            
                if ((total / i) > settings.max_temp) {
                    tweet("DANGER: Maximum temperature reached, currently: " + query.temperature + "ºC");
                    danger = true;
                }
            }
        }

        var payload = { temperature: query.temperature, time: last_received };
        var rkey = 'ex-' + last_received.getFullYear() + "-" + String(last_received.getMonth() + 1).pad(2) + "-" + String(last_received.getDate()).pad(2);
        redisClient.sadd(rkey, JSON.stringify(payload));

        // send out the update to anyone listening
        var keys = clients.keys();
        for (var i in keys) {
            var client = clients.get(keys[i]);
            client.client.send(payload);
        }
    }
}

// check the current state, send out any warnings if needed
function checkState() {
    if (!collecting) {
        return;
    }
    
    var current = new Date();
    if ((current - last_received) > settings.threshold) {
        tweet("DANGER: No data received for over " + (settings.threshold / 1000) + " seconds!");
        collecting = false;
        temperatures = [ ];
    }
}

// send out updates
function updateData() {
    if (!collecting) {
        return;
    }
    
    var i, min, max,
        total = 0;
    
    for (i = 0; i < temperatures.length; i++) {
        var temperature = temperatures[i];
        if (min === undefined || temperature < min) {
            min = temperature;
        }
        if (max === undefined || temperature > max) {
            max = temperature;
        }
        
        total += temperature;
    }
    
    if (!i) {
        collecting = false;
        temperatures = [ ];
        tweet("DANGER: No data during update!");
    } else {
        tweet("Last Temperature: " + temperatures[i - 1] + "ºC (Average: " + (total / i).toFixed(2) + "ºC, Minimum: " + min + "ºC, Maximum: " + max + "ºC)");
    }
}

function tweet(status) {
    return;
    oAuth = new OAuth("http://twitter.com/oauth/request_token",
                    "http://twitter.com/oauth/access_token", 
                    settings.twitterConsumerKey,  settings.twitterConsumerSecret, 
                    "1.0A", null, "HMAC-SHA1");       

    oAuth.post("http://api.twitter.com/1/statuses/update.json",
                settings.twitterAccessToken, 
                settings.twitterAccessTokenSecret,
                { "status": status },
                function (error, data) {
                    if (error) {
                        console.log("Failed twitter update.\n" + require('sys').inspect(error));
                    }
                    else {
                        console.log("update complete");
                    }
                });
}

function handleDateRequest(client, dates) {
    var multi = redisClient.multi();
    
    for (var i in dates) {
        multi = multi.smembers("ex-" + dates[i]);
    }
    multi.exec(function(error, replies) {
        var days = { };

        var reply;
        var length = 0;
        while (reply = replies.shift()) {

            for (var i = 0; i < reply.length; i++) {
                var payload = JSON.parse(reply[i]);

                var temperature = Number(payload.temperature);

                var time = new Date(Date.parse(payload.time));
                var date = time.getFullYear() + "-" + String(time.getMonth() + 1).pad(2) + "-" + String(time.getDate()).pad(2);
            
                if (days[date] === undefined) {
                    days[date] = { };
                    days[date].hours = { };
                    days[date].date = date;
                }
            
                var hours = days[date].hours;
                var hour = hours[time.getHours()];

                if (hour === undefined) {
                    hour = {
                        minimum: temperature,
                        maximum: temperature,
                        hour:    time.getHours(),
                        total:   temperature,
                        count:   1
                    };
                } else {
                    if (hour.minimum > temperature) {
                        hour.minimum = temperature;
                    }
                    if (hour.maximum < temperature) {
                        hour.maximum = temperature;
                    }
                    hour.total += temperature;
                    hour.count += 1;
                }
                hours[time.getHours()] = hour;
            
                days[date].hours = hours;
            }
            length++;
        }
        days.length = length;

        var payload = {
            type:   "data",
            days:   days
        };

        client.send(payload);

    });
}