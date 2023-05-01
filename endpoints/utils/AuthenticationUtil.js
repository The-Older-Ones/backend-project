const jwt = require('jsonwebtoken');
const config = require("config");

function isAuthenticated(req, res, next) {
	if (req.headers.authorization) {
		const token = req.headers.authorization.split(" ")[1];
		const privateKey = config.get("session.tokenKey");
		jwt.verify(token, privateKey, { algorithms: "HS256" }, function (err, result) {
			if (result) {
				req.payload = result;
				return next();
			} else {
				res.status(401).json({ Error: 'Not Authenticated' });
				return;
			}
		});
	} else {
		res.status(401).json({ Error: 'Not Authenticated' });
	}
}

module.exports = {
    isAuthenticated
}