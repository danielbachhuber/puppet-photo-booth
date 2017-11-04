var aws = require('aws-sdk'),
	crypto = require('crypto'),
	{ errorResponse } = require('../utils' ),
	moment = require('moment'),
	puppeteer = require('puppeteer'),
	queryString = require('query-string'),
	url = require('url');

var serveScreenshot = (res, buffer, headers) => {
	console.log('Serving screenshot.');
	res.writeHead(200, headers);
	res.write(buffer);
	res.end();
}

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
		errorResponse(res, 400, 'Invalid URL specified.');
		return;
	}

	screenshotFormat = screenshotFormat.toLowerCase();
	if ( -1 === ['jpeg','png'].indexOf(screenshotFormat) ) {
		errorResponse(res, 400, 'Invalid format specified.');
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
		}).then( async (buffer) => {
			var contentType = 'image/' + screenshotFormat;
			var headers = {
				'Content-Type': contentType,
				'X-PPB-Source-URL': screenshotRes.url,
				'X-PPB-Status-Code': screenshotRes.status,
			};
			if ( process.env.AWS_S3_BUCKET
				&& process.env.AWS_ACCESS_KEY_ID
				&& process.env.AWS_SECRET_ACCESS_KEY ) {
				console.log('Uploading to Amazon S3');
				var bucket = process.env.AWS_S3_BUCKET;
				var region = process.env.AWS_S3_REGION || 'us-west-1';
				var filename = url.parse(screenshotUrl).hostname.replace('.', '-')
					+ '-' + moment().format('YYYY-MM-DD-HH-mm-ss')
					+ '-' + crypto.randomBytes(64).toString('hex').substr(0, 8)
					+ '.' + screenshotFormat;
				var s3 = new aws.S3({
					region: region
				});
				s3.putObject({
					Bucket: process.env.AWS_S3_BUCKET,
					Body: buffer,
					Key: filename,
					ContentType: contentType,
					ACL: 'public-read'
				},( error, data ) => {
					if ( error ) {
						errorResponse(res, 500, 'Error uploading to S3' );
					} else {
						headers['X-PPB-Screenshot-URL'] = 'https://s3-' + region + '.amazonaws.com/' + bucket + '/' + filename;
						serveScreenshot(res, buffer, headers);
					}
				});
			} else {
				serveScreenshot(res, buffer, headers);
			}
		}).catch(function( error ){
			console.log( error );
			errorResponse(res, 500, 'Error capturing screenshot.');
		});
	}).catch(function(){
		errorResponse(res, 500, 'Could not goto URL.');
	});
	await browser.close();
});

module.exports = fetchEndpoint;
