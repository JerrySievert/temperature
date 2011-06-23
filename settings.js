// webserver settings
exports.host    = '0.0.0.0';
exports.port    = 8080;
exports.htdocs  = './htdocs/';
exports.logfile = './logs/access.log';

// thresholds - when to send out alerts
exports.threshold = 30000;
exports.max_temp  = -3;
exports.min_avg   = 5;
exports.max_avg   = 12;

// twitter oAuth keys
exports.twitterConsumerKey       = 'yourKey';
exports.twitterConsumerSecret    = 'yourSecret';
exports.twitterAccessToken       = 'yourAccessToken';
exports.twitterAccessTokenSecret = 'yourAccessTokenSecret';

// temperature posting shared key
exports.key = 'yourSharedKey';
