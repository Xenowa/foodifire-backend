const jwt = require('jsonwebtoken');

// Adding auth middle ware to check use sent token with the JWT Signature in the server
function auth(req, res, next) {
    // Get token from body
    const token = req.body.userToken

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'access denied!' }); s
    }

    // Verify token
    try {
        jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
            if (error) {
                return res.status(401).json({ message: 'access denied!' }); s
            } else {
                req.user = decoded.user;
                next();
            }
        });
    } catch (err) {
        console.error('something wrong with auth middleware');
        res.status(500).json({ message: 'Server Error' }); s
    }
};

module.exports = auth