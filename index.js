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

		console.log('Fetching: ' + screenshotUrl);
		await page.goto(screenshotUrl).catch(function(){
			msg = 'Could not goto URL.';
			console.log(msg);
			res.writeHead(500);
			res.write(msg);
			res.end();
		});
		await page.screenshot({
			fullPage: true,
		}).then(function(buffer){
			console.log('Serving screenshot.');
			res.writeHead(200,{'Content-Type': 'image/png'});
			res.write(buffer);
			res.end();
		}).catch(function(){
			msg = 'Error capturing screenshot.';
			console.log(msg);
			res.writeHead(500);
			res.write(msg);
			res.end();
		});
		await browser.close();

	})();
}).listen(port);
