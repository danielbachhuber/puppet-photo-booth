var http = require('http'),
	puppeteer = require('puppeteer'),
	queryString = require('query-string'),
	port = process.env.PORT || 8080;


var fetchEndpoint = (async (req, res) => {
	var launchArgs = {};
	if ( process.env.PPB_LAUNCH_CHROME_INSECURE ) {
		launchArgs = {
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox'
			]
		};
	}

	var queryArgs = queryString.parse(queryString.extract(req.url)),
		screenshotUrl = queryArgs.url || '',
		screenshotWidth = queryArgs.width || 1024,
		screenshotFormat = queryArgs.format || 'png';

	if ( ! screenshotUrl.length ) {
		msg = 'Invalid URL specified.';
		console.log(msg);
		res.writeHead(400);
		res.write(msg);
		res.end();
		return;
	}

	screenshotFormat = screenshotFormat.toLowerCase();
	if ( -1 === ['jpeg','png'].indexOf(screenshotFormat) ) {
		msg = 'Invalid format specified.';
		console.log(msg);
		res.writeHead(400);
		res.write(msg);
		res.end();
		return;
	}

	var browser = await puppeteer.launch( launchArgs ),
		page = await browser.newPage();

	if ( 'http://' !== screenshotUrl.substr(0,7)
		&& 'https://' !== screenshotUrl.substr(0,8) ) {
		var oldScreenshotUrl = screenshotUrl;
		screenshotUrl = 'http://' + screenshotUrl;
		console.log( 'Corrected ' + oldScreenshotUrl + ' to ' + screenshotUrl );
	}

	page.setViewport({
		width: parseInt( screenshotWidth ),
		height: 800,
	});

	console.log('Fetching: ' + screenshotUrl);
	await page.goto(screenshotUrl).then( async ( screenshotRes ) => {
		await page.screenshot({
			fullPage: true,
			type: screenshotFormat,
		}).then(function(buffer){
			console.log('Serving screenshot.');
			res.writeHead(200,{
				'Content-Type': 'image/' + screenshotFormat,
				'X-PPB-URL': screenshotRes.url,
				'X-PPB-Status-Code': screenshotRes.status,
			});
			res.write(buffer);
			res.end();
		}).catch(function(){
			msg = 'Error capturing screenshot.';
			console.log(msg);
			res.writeHead(500);
			res.write(msg);
			res.end();
		});
	}).catch(function(){
		msg = 'Could not goto URL.';
		console.log(msg);
		res.writeHead(500);
		res.write(msg);
		res.end();
	});
	await browser.close();
});


console.log( 'Starting server at http://localhost:' + port );
http.createServer(function(req,res){
	var endpoint = req.url.split('?')[0].replace(/^[\/]+/,'').replace(/[\/]+$/,'');
	switch( endpoint ) {
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
