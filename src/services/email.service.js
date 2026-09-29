const nodemailer = require("nodemailer");
const config = require("../config/config");
const logger = require("../config/logger");
const {
  forgotPasswordSendOTPFormat,
  emailVerificationFormat,
} = require("../../public/Email_Template");

const transport = nodemailer.createTransport(config.email.smtp);

if (config.env !== "test") {
  transport
    .verify()
    .then(() => logger.info("Connected to email server"))
    .catch(() =>
      logger.warn(
        "Unable to connect to email server. Make sure you have configured the SMTP options in .env"
      )
    );
}

const sendEmail = async (to, subject, text) => {
  const msg = { from: config.email.from, to, subject, text };
  return await transport.sendMail(msg);
};

const sendEmailVerification = async (to, otp) => {
  const message = {
    from: `${config.email.from}`,
    to: `${to}`,
    subject: "Please verify your email",
    text: `Please click on the following link to verify your email`,
    html: `${emailVerificationFormat(otp)}`,
  };
  transport.sendMail(message, (error, info) => {
    if (error) {
      console.log("Email sent error:  ", error);
      return false;
    } else {
      return true;
    }
  });
};

const sendForgotPasswordOTP = async (to, otp) => {
  const message = {
    from: `${config.email.from}`,
    to: `${to}`,
    subject: "OTP for Forgot password",
    text: `Please click on the following link to verify your email`,
    html: `${forgotPasswordSendOTPFormat(otp)}`,
  };
  transport.sendMail(message, (error, info) => {
    if (error) {
      console.log("Email sent error:  ", error);
      return false;
    } else {
      return true;
    }
  });
};

const sendResetPasswordConfirmationMail = async (to) => {
  const subject = "Successfully Changed password";
  const text = `Dear user,
    Your Password Has Been changed Successfully
    If you did not request any password resets, then ignore this email.`;
  return await sendEmail(to, subject, text);
};

const sendUserCredentials = async (to, password) => {
  const subject = "Welcome to My Story Bank: Your Login Credentials";
  const text = `Dear User,

Welcome to My Story Bank! You have been successfully registered by our admin. Please find
your login credentials below:
Now, get ready to embark on an exciting journey of storytelling and creativity!
To access your account, please visit our secure login page with your login credentials below:
  

Website: https://mystorybank.info/
Email Address: ${to}
Password: ${password}
  
Remember to keep these details safe and secure!
Feel free to share your thoughts, ideas, and captivating stories with our incredible community.
Together, let's weave tales that inspire, entertain, and leave a lasting impact!
Once again, a warm welcome to My Story Bank! Get ready to unleash your imagination and let
your stories shine!
If you have any issues or have additional questions, please send an email to
info.mystorybank@gmail.com

 Best Regards,
 MSB Team`;

  return await sendEmail(to, subject, text);
};

const sendAdminCredentials = async (to, password) => {
  const subject = "Welcome to My Story Bank: Your Login Credentials";
  const text = `Dear User,

Welcome to My Story Bank! You have been successfully registered by our admin. Please find your login credentials below:

Email Address: ${to}
Temporary Password: ${password}

To access your account, please visit our secure login page:
https://admin.mystorybank.info/

For security reasons, we highly recommend changing your password after your first login. If you did not create this account, please ignore this email.

Best Regards,
MSB Team`;

  return await sendEmail(to, subject, text);
};

module.exports = {
  sendForgotPasswordOTP,
  sendResetPasswordConfirmationMail,
  sendEmailVerification,
  sendUserCredentials,
  sendAdminCredentials,
};
