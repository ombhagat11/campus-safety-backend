import nodemailer from 'nodemailer';

// Create reusable transporter
let transporter;

const initTransporter = () => {
  if (transporter) return transporter;

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email service not configured (missing EMAIL_USER or EMAIL_PASSWORD). Email features will be disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return transporter;
};

export const sendVerificationEmail = async (email, token, name) => {
  try {
    const transport = initTransporter();
    if (!transport) {
      console.log('📧 Email service not configured - skipping verification email');
      return false;
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${process.env.APP_NAME || 'Campus Safety'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome ${name}!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${email}:`, error.message);
    return false;
  }
};

/**
 * Send OTP email for verification or password reset
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} name - User's name
 * @param {string} purpose - 'verification' or 'reset'
 */
export const sendOTPEmail = async (email, otp, name, purpose = 'verification') => {
  try {
    const transport = initTransporter();
    if (!transport) {
      console.log('📧 Email service not configured - skipping OTP email');
      console.log(`🔐 OTP for ${email}: ${otp}`);
      return false;
    }

    const isVerification = purpose === 'verification';
    const subject = isVerification ? 'Verify Your Email - OTP Code' : 'Password Reset - OTP Code';
    const title = isVerification ? 'Email Verification' : 'Password Reset';
    const message = isVerification
      ? 'Thank you for registering! Please use the OTP code below to verify your email address:'
      : 'We received a request to reset your password. Use the OTP code below to proceed:';

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${process.env.APP_NAME || 'Campus Safety'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0ea5e9; margin: 0;">${title}</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <p style="color: white; font-size: 14px; margin: 0 0 10px 0;">Your OTP Code</p>
            <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block;">
              <h2 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h2>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #334155; margin: 0 0 10px 0;">Hello ${name},</p>
            <p style="color: #475569; margin: 0;">${message}</p>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>⚠️ Important:</strong> This OTP will expire in <strong>10 minutes</strong>. 
              Do not share this code with anyone.
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
            If you didn't request this ${isVerification ? 'verification' : 'password reset'}, please ignore this email.
          </p>
          
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 10px;">
            This is an automated message from ${process.env.APP_NAME || 'Campus Safety'}. Please do not reply.
          </p>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email} for ${purpose}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    // Still log OTP to console for development
    console.log(`🔐 OTP for ${email}: ${otp}`);
    return false;
  }
};

export const sendPasswordResetEmail = async (email, token, name) => {
  try {
    const transport = initTransporter();
    if (!transport) {
      console.log('📧 Email service not configured - skipping password reset email');
      return false;
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${process.env.APP_NAME || 'Campus Safety'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${name},</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2196F3; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${email}:`, error.message);
    return false;
  }
};

export const sendModeratorInvite = async (email, name, tempPassword, campusName) => {
  try {
    const transport = initTransporter();
    if (!transport) {
      console.log('📧 Email service not configured - skipping moderator invite email');
      return false;
    }

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${process.env.APP_NAME || 'Campus Safety'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Moderator Invitation - ${campusName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${name},</h2>
          <p>You've been invited to be a moderator for <strong>${campusName}</strong>!</p>
          <p>Your temporary login credentials:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
          </div>
          <p><strong>Important:</strong> Please change your password immediately after logging in.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #FF9800; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Login Now
            </a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't expect this invitation, please contact the campus administrator.
          </p>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    console.log(`✅ Moderator invite sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send moderator invite to ${email}:`, error.message);
    return false;
  }
};

export const sendNotificationEmail = async (email, name, title, message, reportLink) => {
  try {
    const transport = initTransporter();
    if (!transport) {
      console.log('📧 Email service not configured - skipping notification email');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"${process.env.APP_NAME || 'Campus Safety'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${name},</h2>
          <h3>${title}</h3>
          <p>${message}</p>
          ${reportLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reportLink}" 
                 style="background-color: #9C27B0; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Report
              </a>
            </div>
          ` : ''}
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated notification from ${process.env.APP_NAME || 'Campus Safety'}.
          </p>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    console.log(`✅ Notification email sent to ${email}: ${title}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification to ${email}:`, error.message);
    return false;
  }
};

export const verifyEmailConfig = async () => {
  try {
    const transport = initTransporter();
    if (!transport) {
      console.log('⚠️  Email service not configured - email features will be disabled');
      return false;
    }

    await transport.verify();
    console.log('✅ Email service configured successfully');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration failed:', error.message);
    return false;
  }
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendModeratorInvite,
  sendNotificationEmail,
  verifyEmailConfig,
};