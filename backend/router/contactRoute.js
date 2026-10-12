import express from "express";
import nodemailer from "nodemailer";
import authMiddleware from "../auth/auth.js"

const router = express.Router();

router.post("/send-email", async (req, res) => {
    const { firstName, lastName, email, message, communication, dataConsent } = req.body;


    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });


    const mailOptions = {
        from: process.env.EMAIL,
        to: "collegeatlas.info@gmail.com",
        subject: `New Contact Form Submission from ${firstName} ${lastName}`,
        text: `
        First Name: ${firstName}
        Last Name: ${lastName}
        Email: ${email}
        Message: ${message}
        Agreed to Communication: ${communication}
        Agreed to Data Storage: ${dataConsent}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Email sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, message: "Failed to send email" });
    }
});

export default router;