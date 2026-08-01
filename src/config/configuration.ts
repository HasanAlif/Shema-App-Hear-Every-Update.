export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET_KEY ?? 'fallback-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES ?? '5', 10),
  },

  mail: {
    host: process.env.MAIL_HOST ?? 'smtp.example.com',
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user: process.env.MAIL_USER ?? '',
    pass: process.env.MAIL_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'No Reply <no-reply@example.com>',
  },
});
