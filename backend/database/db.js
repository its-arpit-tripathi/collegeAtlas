import mongoose from "mongoose";

async function connectDB() {
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    const primaryURL = process.env.URL;
    const fallbackURL = "mongodb://127.0.0.1:27017/collegefinder";

    if (!primaryURL && process.env.VERCEL) {
        throw new Error("MongoDB URL is missing. Please set the 'URL' environment variable in your Vercel project settings.");
    }

    const targetURL = primaryURL || fallbackURL;

    try {
        await mongoose.connect(targetURL, {
            serverSelectionTimeoutMS: 5000
        });
        console.log("Database Connected Successfully to", targetURL.startsWith("mongodb+srv") ? "MongoDB Atlas" : "Local Database");
        return mongoose.connection;
    } catch (e) {
        console.error(`Database Connection Failed: ${e.message}`);
        
        if (primaryURL && primaryURL !== fallbackURL && !process.env.VERCEL) {
            console.log(`Attempting fallback to local MongoDB: ${fallbackURL}`);
            try {
                await mongoose.connect(fallbackURL, { serverSelectionTimeoutMS: 3000 });
                console.log("Database Connected Successfully to Local Fallback!");
                return mongoose.connection;
            } catch (fallbackErr) {
                console.error("Local Database Fallback also failed:", fallbackErr.message);
                throw fallbackErr;
            }
        } else {
            throw e;
        }
    }
}

export default connectDB;