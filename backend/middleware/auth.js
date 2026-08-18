import jwt from 'jsonwebtoken';
import { roleCan } from '../utils/permissions.js';

const JWT_SECRET = process.env.JWT_SECRET || 'shiftsathi-jwt-secret-change-in-production';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('Refusing to start in production without JWT_SECRET set');
  process.exit(1);
}

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }
  next();
};

export const requireRole = (...roles) => {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ success: false, message: 'Authentication required' });
		}
		if (!roles.includes(req.user.role)) {
			return res.status(403).json({ success: false, message: 'Insufficient permissions' });
		}
		next();
	};
};

// Capability-based authorization. Pass one or more capability strings; the
// request is allowed when the caller's role holds ANY of them (super_admin
// always passes at this layer). Tenancy is enforced separately by scope.js.
export const authorize = (...capabilities) => {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ success: false, message: 'Authentication required' });
		}
		if (!roleCan(req.user.role, capabilities)) {
			return res.status(403).json({ success: false, message: 'Insufficient permissions' });
		}
		next();
	};
};
