// src/server.ts

import express, { Request, Response, NextFunction } from "express";
import nodemailer from "nodemailer";
import Joi from "joi";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env

const app = express();

// Middleware to parse JSON body data
app.use(express.json());

// Configure your SMTP transporter with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true", // converts string to boolean
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Define a Joi schema for the incoming email data
const emailSchema = Joi.object({
  from: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  fromName: Joi.string().required(),
  to: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": '"to" must be a valid email address.',
      "any.required": '"to" is required.',
    }),
  subject: Joi.string().min(1).required().messages({
    "string.min": '"subject" cannot be empty.',
    "any.required": '"subject" is required.',
  }),
  text: Joi.string(),
  html: Joi.string(),
})
  .or("text", "html")
  .messages({
    "object.missing": 'Either "text" or "html" content must be provided.',
  });

// Async route handler with req, res, and next parameters.
// Return type is Promise<void>
app.post(
  "/send-email",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const { to, subject, text, html, from, fromName } = value;

    const mailOptions = {
      from: `"${fromName}" <${from}>`, // Using env variable for sender email
      to,
      subject,
      text,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.response);
      res.status(200).json({ message: "Email sent successfully", info });
    } catch (sendError: any) {
      console.error("Error sending email:", sendError);
      // Optionally pass the error to Express error-handling middleware:
      next(sendError);
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
