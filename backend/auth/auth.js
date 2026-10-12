import jwt from "jsonwebtoken";


function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const token = req.cookies?.token || bearerToken;

    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ 
      error: "Invalid or expired token."
    });
  }
}
export default authMiddleware;  