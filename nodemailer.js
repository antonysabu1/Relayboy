import nodemailer from "nodemailer";
import dns from "dns";

// Prefer IPv4 on platforms without IPv6 egress (e.g., Render)
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  // Force IPv4 resolution for SMTP
  lookup: (hostname, options, callback) => {
    return dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
  },
});

if (process.env.NODE_ENV !== "production") {
  transporter.verify((error) => {
    if (error) {
      console.error("Nodemailer verification failed:", error);
    } else {
      console.log("Nodemailer is ready to send emails");
    }
  });
}

export default transporter;
