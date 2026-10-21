import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { env } from '../config/env.js';

const credentials = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) });
const registration = credentials.extend({ name: z.string().trim().min(2).max(80), username: z.string().regex(/^[a-z0-9_]{3,30}$/) });

function setSession(res, user) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.cookie(env.cookieName, token, { httpOnly: true, secure: env.cookieSecure, sameSite: env.cookieSameSite, maxAge: 15 * 60 * 1000, path: '/' });
}

function validationError(result) { return result.success ? null : result.error.issues.map((issue) => issue.message).join(', '); }

export async function register(req, res, next) {
  try {
    const parsed = registration.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: validationError(parsed) });
    const { name, username, email, password } = parsed.data;
    const exists = await User.exists({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ error: 'Email or username is already in use' });
    const user = await User.create({ name, username, email, passwordHash: await bcrypt.hash(password, 12) });
    setSession(res, user);
    return res.status(201).json({ user: user.toSafeJSON() });
  } catch (error) { return next(error); }
}

export async function login(req, res, next) {
  try {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: validationError(parsed) });
    const user = await User.findOne({ email: parsed.data.email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account is suspended' });
    setSession(res, user);
    return res.json({ user: user.toSafeJSON() });
  } catch (error) { return next(error); }
}

export function logout(req, res) { res.clearCookie(env.cookieName, { httpOnly: true, secure: env.cookieSecure, sameSite: env.cookieSameSite, path: '/' }); res.status(204).end(); }
export function me(req, res) { res.json({ user: req.user.toSafeJSON() }); }

