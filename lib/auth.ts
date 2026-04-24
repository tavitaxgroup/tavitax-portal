import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

/**
 * Giải mã token từ cookie tavitax-auth.
 * Hỗ trợ cả JWT (mới) lẫn base64 (cũ - giai đoạn chuyển đổi).
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    // Fallback: thử parse base64 cũ (cho giai đoạn chuyển đổi)
    try {
      return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }
}

/**
 * Ký JWT token mới cho user data.
 */
export function signToken(userData: object, expiresIn: number = 3600): string {
  return jwt.sign(userData, JWT_SECRET, { expiresIn });
}
