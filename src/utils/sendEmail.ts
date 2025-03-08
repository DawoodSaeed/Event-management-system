import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "./logger";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "a36d46bd86784e",
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
) => {
  try {
    await transporter.sendMail({
      from: `"Event Management System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    logger.info(`Email sent to: ${to}`);
  } catch (error) {
    logger.error(`Email sending failed: ${error}`);
  }
};

export default sendEmail;
