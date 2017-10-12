var http = require('http'),
	puppeteer = require('puppeteer'),
	port = process.env.PORT || 3000;

console.log( 'Starting server at http://localhost:' + port );
http.createServer(function(req,res){
	(async () => {
		var browser = await puppeteer.launch(),
			page = await browser.newPage(),
			screenshotUrl = req.url.replace(/^[\/]+/, '');

		if ( ! screenshotUrl.length ) {
			msg = 'Invalid URL specified.';
			console.log(msg);
			res.writeHead(400);
			res.write(msg);
			res.end();
			return;
		}

		if ('favicon.ico' === screenshotUrl) {
			res.writeHead(404);
			res.end();
			return;
		}

		if ( 'http://' !== screenshotUrl.substr(0,7)
			&& 'https://' !== screenshotUrl.substr(0,8) ) {
			var oldScreenshotUrl = screenshotUrl;
			screenshotUrl = 'http://' + screenshotUrl;
			console.log( 'Corrected ' + oldScreenshotUrl + ' to ' + screenshotUrl );
		}

		console.log('Fetching: ' + screenshotUrl);
		await page.goto(screenshotUrl).then( async ( screenshotRes ) => {
			await page.screenshot({
				fullPage: true,
			}).then(function(buffer){
				console.log('Serving screenshot.');
				res.writeHead(200,{
					'Content-Type': 'image/png',
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

	})();
}).listen(port);
