function isAdministrator(req, res, next) {
	if (req.payload) {
		req.payload.isAdministrator ? next() : res.status(403).json({ Error: "Not Authorised" })
	} else {
		res.status(401).json({ Error: 'Not Authenticated' });
	}
}

function isUser(req, res, next) {
	if (req.payload) {
		if (req.payload.isAdministrator || req.payload.user == req.params.userID) {
			return next();
		} else {
			res.status(403).json({ Error: 'Not Authorized' });
		}
	} else {
		res.status(401).json({ Error: 'Not Authenticated' });
	}
}

module.exports = {
    isAdministrator,
    isUser
}