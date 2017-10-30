var fs = require('fs'),
	http = require('http'),
	{ execFile } = require('child_process'),
	superagent = require('superagent'),
	binaryParser = require('superagent-binary-parser'),
	puppeteer = require('puppeteer'),
	queryString = require('query-string'),
	tempy = require('tempy'),
	port = process.env.PORT || 8080;

var errorResponse = (res, code, msg = '') => {
	res.writeHead(code);
	if ( msg.length ) {
		console.log(msg);
		res.write(msg);
	}
	res.end();
};

var compareEndpoint = (async (req, res) => {
	var queryArgs = queryString.parse(queryString.extract(req.url)),
		imageUrls = queryArgs.image || [];
	if ( 0 === imageUrls.length || imageUrls.length > 2 ) {
		errorResponse(res, 400, 'Please provide two images');
		return;
	}

	var asyncDownload = (async (url, dest) => {
		var file = fs.createWriteStream(dest);
		var response = await superagent.get(url).parse(binaryParser).buffer();
		if ( 200 !== response.statusCode ) {
			errorResponse(res, 400, 'Could not download image: ' + url);
			return;
		}
		console.log( 'Downloaded ' + url );
		fs.writeFileSync(dest, response.body);
	});

	var imageA = tempy.file(),
		imageB = tempy.file(),
		compareImage = tempy.file();

	await asyncDownload(imageUrls[0], imageA);
	await asyncDownload(imageUrls[1], imageB);

	execFile('compare',[
		'-metric',
		'mae',
		imageA,
		imageB,
		compareImage,
	],(error, stdout, stderr)=>{
		fs.unlink(imageA,()=>{});
		fs.unlink(imageB,()=>{});
		fs.unlink(compareImage,()=>{});
		// ImageMagick uses 1 to denote comparison failure :(
		if ( error.code > 1 ) {
			errorResponse(res, 500, stderr);
			return;
		}
		var comparison = stdout || stderr;
		console.log( 'Comparison: ' + comparison );
		res.writeHead(200,{
			'Content-Type': 'application/json',
		});
		res.write(JSON.stringify({
			comparison: comparison,
		}));
		res.end();
	});
});

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
