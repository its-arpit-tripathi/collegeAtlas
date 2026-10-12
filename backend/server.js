import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./database/db.js";
import dataRouter from "./router/dataRouter.js";
import contactRoute from "./router/contactRoute.js";
import userRoute from "./router/userRoute.js";
import authMiddleware from "./auth/auth.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path:"./config.env", override: true});
const app = express();
const PORT = process.env.PORT || 8000;
app.use(cookieParser());


connectDB();



app.use(express.json());

const allowedOrigins = [
  "https://global-college-finder.vercel.app",
  "http://localhost:3000",
  "http://localhost:8000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

app.use(dataRouter);
app.use(contactRoute);
app.use(userRoute);

app.get("/auth", authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT} `);
})

export default app;