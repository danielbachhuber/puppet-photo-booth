var binaryParser = require('superagent-binary-parser'),
	{ errorResponse } = require('../utils' ),
	{ execFile } = require('child_process'),
	fs = require('fs'),
	queryString = require('query-string'),
	superagent = require('superagent'),
	tempy = require('tempy');

var compareEndpoint = (async (req, res) => {
	var queryArgs = queryString.parse(queryString.extract(req.url)),
		imageA = queryArgs.imageA || false,
		imageB = queryArgs.imageB || false;
	if ( ! imageA || ! imageB ) {
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

	var imageAlocal = tempy.file(),
		imageBlocal = tempy.file(),
		compareImage = tempy.file();

	await asyncDownload(imageA, imageAlocal);
	await asyncDownload(imageB, imageBlocal);

	var unlinkImages = () => {
		fs.unlink(imageAlocal,()=>{});
		fs.unlink(imageBlocal,()=>{});
		fs.unlink(compareImage,()=>{});
	}

	execFile('compare',[
		'-metric',
		'mae',
		imageAlocal,
		imageBlocal,
		compareImage,
	],(error, stdout, stderr)=>{
		// ImageMagick uses 1 to denote comparison failure :(
		if ( error && error.code > 1 ) {
			unlinkImages();
			errorResponse(res, 500, stderr);
			return;
		}
		var comparison = stdout || stderr;
		console.log( 'Comparison: ' + comparison );
		comparison = comparison.match(/\(([\d\.]+)\)/)[1];
		var percentDiff = comparison * 100;
		console.log( 'percentDiff: ' + percentDiff );
		res.writeHead(200,{
			'Content-Type': 'image/png',
			'X-PPB-Percent-Diff': percentDiff
		});
		res.write( fs.readFileSync( compareImage ) );
		res.end();
		unlinkImages();
	});
});

module.exports = compareEndpoint;
