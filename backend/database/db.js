import mongoose from "mongoose";

async function connectDB() {
    const primaryURL = process.env.URL;
    const fallbackURL = "mongodb://127.0.0.1:27017/collegefinder";

    try {
        await mongoose.connect(primaryURL);
        console.log("Database Connected Successfully to Primary URL");
    } catch (e) {
        console.warn(`Primary Database Connection Failed: ${e.message}`);
        
        if (primaryURL !== fallbackURL) {
            console.log(`Attempting fallback to local MongoDB: ${fallbackURL}`);
            try {
                await mongoose.connect(fallbackURL);
                console.log("Database Connected Successfully to Local Fallback!");
            } catch (fallbackErr) {
                console.error("Local Database Fallback also failed:", fallbackErr.message);
                console.error("\n=========================================================================");
                console.error("❌ ERROR: Connection to both Cloud MongoDB Atlas and Local MongoDB failed.");
                console.error("👉 To fix the Cloud Atlas error (querySrv ENOTFOUND):");
                console.error("   1. Change your DNS server settings on your computer to Google Public DNS");
                console.error("      (8.8.8.8 and 8.8.4.4) or Cloudflare DNS (1.1.1.1).");
                console.error("   2. Verify that your IP Address is whitelisted in your MongoDB Atlas Dashboard.");
                console.error("👉 To run locally:");
                console.error("   Make sure MongoDB is installed locally on your system and running on port 27017.");
                console.error("=========================================================================\n");
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
}

export default connectDB;