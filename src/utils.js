
var errorResponse = (res, code, msg = '') => {
	res.writeHead(code);
	if ( msg.length ) {
		console.log(msg);
		res.write(msg);
	}
	res.end();
};

module.exports = {
	errorResponse: errorResponse,
};
