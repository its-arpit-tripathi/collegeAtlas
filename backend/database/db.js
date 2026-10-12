import mongoose from "mongoose";

async function connectDB() {
    if (mongoose.connection.readyState >= 1) {
        return;
    }

    const primaryURL = process.env.URL;
    const fallbackURL = "mongodb://127.0.0.1:27017/collegefinder";

    if (!primaryURL) {
        console.warn("process.env.URL is not defined.");
        return;
    }

    try {
        await mongoose.connect(primaryURL);
        console.log("Database Connected Successfully to Primary URL");
    } catch (e) {
        console.warn(`Primary Database Connection Failed: ${e.message}`);
        
        if (primaryURL !== fallbackURL && !process.env.VERCEL) {
            console.log(`Attempting fallback to local MongoDB: ${fallbackURL}`);
            try {
                await mongoose.connect(fallbackURL);
                console.log("Database Connected Successfully to Local Fallback!");
            } catch (fallbackErr) {
                console.error("Local Database Fallback also failed:", fallbackErr.message);
                process.exit(1);
            }
        } else if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
}

export default connectDB;