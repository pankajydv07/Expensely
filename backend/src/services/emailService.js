const nodemailer = require('nodemailer');
require('dotenv').config();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
});

/**
 * Send password reset email with new temporary password
 */
const sendPasswordResetEmail = async (email, name, newPassword) => {
  try {
    const mailOptions = {
      from: `"Expensely Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your New Expensely Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Password Reset - Expensely</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .password-box { background: #fff; padding: 20px; border: 2px solid #1976d2; border-radius: 8px; text-align: center; margin: 20px 0; }
                .password { font-size: 24px; font-weight: bold; color: #1976d2; letter-spacing: 2px; }
                .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
                .footer { text-align: center; color: #666; margin-top: 30px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Expensely</h1>
                    <p>Password Reset Request</p>
                </div>
                <div class="content">
                    <h2>Hello ${name},</h2>
                    <p>We received a request to reset your password for your Expensely account. Your new temporary password has been generated:</p>
                    
                    <div class="password-box">
                        <p><strong>Your New Password:</strong></p>
                        <div class="password">${newPassword}</div>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>This is a temporary password generated for security</li>
                            <li>Please log in and change this password immediately</li>
                            <li>Do not share this password with anyone</li>
                            <li>This email contains sensitive information - please delete it after use</li>
                        </ul>
                    </div>
                    
                    <p><strong>Next Steps:</strong></p>
                    <ol>
                        <li>Go to the Expensely login page</li>
                        <li>Use your email (${email}) and the new password above</li>
                        <li>Update your password to something secure and memorable</li>
                    </ol>
                    
                    <p>If you didn't request this password reset, please contact your administrator immediately.</p>
                </div>
                <div class="footer">
                    <p>This email was sent from Expensely - Expense Management System</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name},
        
        We received a request to reset your password for your Expensely account.
        
        Your new temporary password is: ${newPassword}
        
        Security Notice:
        - This is a temporary password generated for security
        - Please log in and change this password immediately
        - Do not share this password with anyone
        
        Next Steps:
        1. Go to the Expensely login page
        2. Use your email (${email}) and the new password above
        3. Update your password to something secure and memorable
        
        If you didn't request this password reset, please contact your administrator immediately.
        
        Best regards,
        Expensely Support Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Password reset email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Generate a secure random password
 */
const generateRandomPassword = () => {
  const length = 12;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each set
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Test email configuration
 */
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready to send emails');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  generateRandomPassword,
  testEmailConnection,
};