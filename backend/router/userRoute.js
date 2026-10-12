import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { signupSchema, signinSchema } from "../validators/validate.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
    try {
      const parsedData = await signupSchema.safeParseAsync(req.body);
  
      if (!parsedData.success) {
        return res.status(400).json({
          message: parsedData.error.issues[0].message,
        });
      }
  
      const { email, password } = parsedData.data;
      const hashedPass = await bcrypt.hash(password, 10);
  
      await userModel.create({
        email: email,
        password: hashedPass,
      });
  
      res.status(201).json({
        message: "User signed up successfully ✅",
      });
  
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "A user with this email already exists 🚨"
        });
      }
  
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/signin", async (req, res) => {
    try {
      const parsedData = await signinSchema.safeParseAsync(req.body);
  
      if (!parsedData.success) {
        return res.status(400).json({
          message: parsedData.error.issues[0].message,
        });
      }
  
      const { email, password } = parsedData.data;
  
      const user = await userModel.findOne({
        email: email
      }); 
        
      if (!user) {
        return res.status(400).json({ error: "User not found! Please First Signup" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid password" });
      } else {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        
        const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
        res.cookie("token", token, {
          httpOnly: true,
          secure: isHttps,       
          sameSite: isHttps ? "none" : "lax",
          maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(200).json({
          message: "User signed in successfully",
          success: true,
          token: token,
          user: {
            id: user._id,
            email: user.email
          }
        });
      }
  
    } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/logout", (req, res) => {
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax"
    });
    res.json({ success: true, message: "Logged out successfully" });
});

export default router;