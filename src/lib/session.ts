export type AdminSessionData = {
  isAdmin: boolean
}

export const adminSessionConfig = {
  password: process.env.SESSION_SECRET ?? '',
  name: 'drukmans_admin',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  cookie: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
}
