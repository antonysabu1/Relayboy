import nodemailer from "nodemailer";
import dns from "dns";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Explicitly force IPv4 to avoid ENETUNREACH issues on Render
    lookup: (hostname, options, callback) => {
        return dns.lookup(hostname, { ...options, family: 4 }, callback);
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Nodemailer verification failed:", error);
    } else {
        console.log("🟢 Nodemailer is ready to send emails");
    }
});

export default transporter;