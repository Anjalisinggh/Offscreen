import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  canSendEmail,
  getTransport,
  sendCode,
  isLocalDev,
  sanitizeErrorMessage,
} from '../lib/mailer.ts';

type MutableEnv = Record<string, string | undefined>;

describe('lib/mailer', () => {
  const originalEnv = { ...process.env };
  let originalCreateTransport: typeof nodemailer.createTransport;
  const env = process.env as MutableEnv;

  beforeEach(() => {
    // Reset process.env to clean state before each test
    for (const key of Object.keys(process.env)) {
      delete env[key];
    }
    Object.assign(process.env, originalEnv);
    originalCreateTransport = nodemailer.createTransport;
  });

  afterEach(() => {
    nodemailer.createTransport = originalCreateTransport;
    for (const key of Object.keys(process.env)) {
      delete env[key];
    }
    Object.assign(process.env, originalEnv);
    // Reset transport cache by ensuring canSendEmail() returns false
    delete env.SMTP_URL;
    getTransport();
  });

  describe('isLocalDev() environment detection', () => {
    it('returns true when in standard development mode', () => {
      env.NODE_ENV = 'development';
      delete env.VERCEL;
      delete env.AWS_LAMBDA_FUNCTION_NAME;
      delete env.CI;
      assert.equal(isLocalDev(), true);
    });

    it('returns true when NODE_ENV is unset in local runs', () => {
      delete env.NODE_ENV;
      delete env.VERCEL;
      delete env.AWS_LAMBDA_FUNCTION_NAME;
      delete env.CI;
      assert.equal(isLocalDev(), true);
    });

    it('returns false in production (NODE_ENV=production)', () => {
      env.NODE_ENV = 'production';
      delete env.VERCEL;
      delete env.AWS_LAMBDA_FUNCTION_NAME;
      delete env.CI;
      assert.equal(isLocalDev(), false);
    });

    it('returns false in Vercel environment', () => {
      delete env.NODE_ENV;
      env.VERCEL = '1';
      assert.equal(isLocalDev(), false);
    });

    it('returns false in AWS Lambda serverless environment', () => {
      delete env.NODE_ENV;
      delete env.VERCEL;
      env.AWS_LAMBDA_FUNCTION_NAME = 'my-function';
      assert.equal(isLocalDev(), false);
    });

    it('returns false in CI environment', () => {
      env.NODE_ENV = 'development';
      env.CI = 'true';
      assert.equal(isLocalDev(), false);
    });
  });

  describe('canSendEmail() and placeholder detection', () => {
    it('returns false when SMTP_URL is unset or empty', () => {
      delete env.SMTP_URL;
      assert.equal(canSendEmail(), false);

      env.SMTP_URL = '';
      assert.equal(canSendEmail(), false);

      env.SMTP_URL = '   ';
      assert.equal(canSendEmail(), false);
    });

    it('returns false for placeholder from .env.example', () => {
      env.SMTP_URL = 'smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465';
      assert.equal(canSendEmail(), false);
    });

    it('returns false for other documentation placeholder tokens', () => {
      env.SMTP_URL = 'smtps://resend:RESEND_API_KEY@smtp.resend.com:465';
      assert.equal(canSendEmail(), false);

      env.SMTP_URL = 'smtp://LOGIN:SMTP_KEY@smtp-relay.brevo.com:587';
      assert.equal(canSendEmail(), false);

      env.SMTP_URL = 'smtps://user:YOUR_PASSWORD@localhost:465';
      assert.equal(canSendEmail(), false);

      env.SMTP_URL = 'smtps://user:CHANGE_ME@localhost:465';
      assert.equal(canSendEmail(), false);

      env.SMTP_URL = 'smtps://you@gmail.com:secret@smtp.gmail.com:465';
      assert.equal(canSendEmail(), false);
    });

    it('returns false for invalid URL or non-smtp protocols', () => {
      env.SMTP_URL = 'not-a-valid-url';
      assert.equal(canSendEmail(), false);

      env.SMTP_URL = 'https://example.com';
      assert.equal(canSendEmail(), false);
    });

    it('returns true for legitimate SMTP configurations', () => {
      env.SMTP_URL = 'smtps://realuser%40gmail.com:abcdefghijklmnop@smtp.gmail.com:465';
      assert.equal(canSendEmail(), true);

      env.SMTP_URL = 'smtps://resend:re_123456789@smtp.resend.com:465';
      assert.equal(canSendEmail(), true);

      env.SMTP_URL = 'smtp://mailer_user:strongpassword99@smtp.example.com:587';
      assert.equal(canSendEmail(), true);
    });
  });

  describe('getTransport() validation', () => {
    it('returns null when SMTP_URL is missing or placeholder', () => {
      delete env.SMTP_URL;
      assert.equal(getTransport(), null);

      env.SMTP_URL = 'smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465';
      assert.equal(getTransport(), null);
    });

    it('creates transport when valid SMTP_URL is configured', () => {
      env.SMTP_URL = 'smtps://user:validpass@smtp.example.com:465';
      const transport = getTransport();
      assert.ok(transport);
      assert.equal(typeof transport.sendMail, 'function');
    });

    it('recreates transport when SMTP_URL changes and invalidates when removed', () => {
      env.SMTP_URL = 'smtps://user:firstpass@smtp.example.com:465';
      const first = getTransport();
      assert.ok(first);

      env.SMTP_URL = 'smtps://user:secondpass@smtp.example.com:465';
      const second = getTransport();
      assert.ok(second);
      assert.notEqual(first, second);

      delete env.SMTP_URL;
      const third = getTransport();
      assert.equal(third, null);
    });
  });

  describe('sanitizeErrorMessage()', () => {
    it('redacts credentials from connection URLs in error messages', () => {
      const errorMsg = 'Failed to connect to smtps://user:supersecret123@smtp.gmail.com:465';
      const sanitized = sanitizeErrorMessage(errorMsg);
      assert.equal(sanitized, 'Failed to connect to smtps://user:***@smtp.gmail.com:465');
      assert.ok(!sanitized.includes('supersecret123'));
    });

    it('leaves safe error messages untouched', () => {
      const msg = 'Connection timed out';
      assert.equal(sanitizeErrorMessage(msg), 'Connection timed out');
    });
  });

  describe('sendCode() delivery and fallback behavior', () => {
    it('falls back to console in local development when SMTP is unconfigured', async () => {
      env.NODE_ENV = 'development';
      delete env.VERCEL;
      delete env.AWS_LAMBDA_FUNCTION_NAME;
      delete env.CI;
      delete env.SMTP_URL;

      const logged: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => { logged.push(args.join(' ')); };

      try {
        await sendCode({ to: 'user@example.com', code: '123456', purpose: 'signup' });
        assert.ok(logged.some((line) => line.includes('Offscreen code for user@example.com: 123456')));
      } finally {
        console.log = originalLog;
      }
    });

    it('throws explicitly in production when SMTP is unconfigured (no console logging)', async () => {
      env.NODE_ENV = 'production';
      delete env.VERCEL;
      delete env.AWS_LAMBDA_FUNCTION_NAME;
      delete env.SMTP_URL;

      const logged: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => { logged.push(args.join(' ')); };

      try {
        await assert.rejects(
          async () => {
            await sendCode({ to: 'user@example.com', code: '123456', purpose: 'signup' });
          },
          /Sign-in email service is not configured/
        );
        // Ensure OTP code was NEVER logged in production
        assert.equal(logged.some((line) => line.includes('123456')), false);
      } finally {
        console.log = originalLog;
      }
    });

    it('sends email successfully when valid SMTP is configured', async () => {
      env.SMTP_URL = 'smtps://user:secret@smtp.example.com:465';
      env.MAIL_FROM = 'Offscreen <hello@offscreen.app>';

      let sentOptions: Record<string, unknown> | null = null;
      nodemailer.createTransport = (() => ({
        sendMail: async (opts: Record<string, unknown>) => {
          sentOptions = opts;
          return { messageId: 'msg-123' };
        },
      })) as unknown as typeof nodemailer.createTransport;

      await sendCode({ to: 'alice@example.com', code: '654321', purpose: 'signup' });

      assert.ok(sentOptions);
      assert.equal((sentOptions as Record<string, unknown>).to, 'alice@example.com');
      assert.equal((sentOptions as Record<string, unknown>).from, 'Offscreen <hello@offscreen.app>');
      assert.ok(String((sentOptions as Record<string, unknown>).subject).includes('654321'));
      assert.ok(String((sentOptions as Record<string, unknown>).text).includes('654321'));
    });

    it('falls back to console in local development when SMTP delivery fails', async () => {
      env.NODE_ENV = 'development';
      delete env.VERCEL;
      delete env.AWS_LAMBDA_FUNCTION_NAME;
      delete env.CI;
      env.SMTP_URL = 'smtps://user:secret@smtp.example.com:465';

      nodemailer.createTransport = (() => ({
        sendMail: async () => {
          throw new Error('connect ECONNREFUSED 127.0.0.1:465');
        },
      })) as unknown as typeof nodemailer.createTransport;

      const logged: string[] = [];
      const warnings: string[] = [];
      const originalLog = console.log;
      const originalWarn = console.warn;
      console.log = (...args: unknown[]) => { logged.push(args.join(' ')); };
      console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };

      try {
        // Must not throw in local development
        await sendCode({ to: 'bob@example.com', code: '789012', purpose: 'reset' });

        assert.ok(warnings.some((w) => w.includes('Sending email via SMTP failed')));
        assert.ok(logged.some((line) => line.includes('Offscreen code for bob@example.com: 789012')));
      } finally {
        console.log = originalLog;
        console.warn = originalWarn;
      }
    });

    it('propagates delivery errors in production (does not fall back to console or leak OTP)', async () => {
      env.NODE_ENV = 'production';
      delete env.VERCEL;
      delete env.AWS_LAMBDA_FUNCTION_NAME;
      env.SMTP_URL = 'smtps://user:secret@smtp.example.com:465';

      nodemailer.createTransport = (() => ({
        sendMail: async () => {
          throw new Error('SMTP authentication failed 535');
        },
      })) as unknown as typeof nodemailer.createTransport;

      const logged: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => { logged.push(args.join(' ')); };

      try {
        await assert.rejects(
          async () => {
            await sendCode({ to: 'carol@example.com', code: '999888', purpose: 'signup' });
          },
          /SMTP authentication failed 535/
        );

        // Verification code MUST NOT be logged in production
        assert.equal(logged.some((line) => line.includes('999888')), false);
      } finally {
        console.log = originalLog;
      }
    });
  });
});
