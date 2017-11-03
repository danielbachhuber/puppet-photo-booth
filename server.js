var compareEndpoint = require('./src/endpoints/compare'),
	fetchEndpoint = require('./src/endpoints/fetch'),
	http = require('http'),
	port = process.env.PORT || 8080;

console.log( 'Starting server at http://localhost:' + port );
http.createServer(function(req,res){
	var endpoint = req.url.split('?')[0].replace(/^[\/]+/,'').replace(/[\/]+$/,'');
	switch( endpoint ) {
		case 'v1/compare':
			compareEndpoint(req, res);
			break;
		case 'v1/fetch':
			fetchEndpoint(req, res);
			break;
		case 'favicon.ico':
			res.writeHead(404);
			res.end();
			break;
		default:
			res.writeHead(400);
			res.write('Endpoint not supported');
			res.end();
			break;
	}

}).listen(port);
