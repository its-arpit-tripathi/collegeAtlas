import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Institute from "../models/dataModels.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env configuration
dotenv.config({ path: path.join(__dirname, "../config.env"), override: true });

async function importData() {
    const primaryURL = process.env.URL;
    const fallbackURL = "mongodb://127.0.0.1:27017/collegefinder";
    let dbConnected = false;

    // Try connecting to Primary Database
    if (primaryURL) {
        console.log("Connecting to Primary Database at:", primaryURL.replace(/\/\/.*@/, "//<credentials>@"));
        try {
            await mongoose.connect(primaryURL);
            console.log("Connected to Primary MongoDB successfully!");
            dbConnected = true;
        } catch (e) {
            console.warn(`⚠️ Primary Database Connection Failed: ${e.message}`);
        }
    }

    // Try connecting to Local Fallback Database
    if (!dbConnected && primaryURL !== fallbackURL) {
        console.log("Attempting fallback connection to local MongoDB at:", fallbackURL);
        try {
            await mongoose.connect(fallbackURL);
            console.log("Connected to Local Fallback MongoDB successfully!");
            dbConnected = true;
        } catch (fallbackErr) {
            console.error("❌ Local Database Fallback also failed:", fallbackErr.message);
        }
    }

    if (!dbConnected) {
        console.error("\n❌ ERROR: Connection to both Cloud MongoDB Atlas and Local MongoDB failed.");
        process.exit(1);
    }

    try {
        const customFile = process.argv[2];
        if (!customFile) {
            console.error("❌ Error: Please specify the path to your JSON database file.");
            console.error("Usage: node database/importColleges.js <path-to-json-file>");
            process.exit(1);
        }
        const seedPath = path.resolve(customFile);

        if (!fs.existsSync(seedPath)) {
            console.error(`❌ Error: JSON file not found at: ${seedPath}`);
            process.exit(1);
        }

        console.log(`Reading colleges database file from: ${seedPath}`);
        const raw = fs.readFileSync(seedPath, "utf-8");
        const data = JSON.parse(raw);

        if (!Array.isArray(data)) {
            console.error("❌ Error: JSON database file must be a JSON array of college objects.");
            process.exit(1);
        }

        console.log(`Normalizing data schema for ${data.length} colleges...`);

        const normalizedData = data.map((uni, index) => {
            const doc = {
                name: uni.name,
                domains: uni.domains || [],
                web_pages: uni.web_pages || [],
                country: uni.country,
                alpha_two_code: uni.alpha_two_code || "",
                state_province: uni.state_province || uni["state-province"] || null
            };

            // Process unique identifiers if present, otherwise let MongoDB generate them
            if (uni._id) {
                if (uni._id.$oid) {
                    doc._id = uni._id.$oid;
                } else {
                    doc._id = uni._id;
                }
            }

            // Simple validation
            if (!doc.name || !doc.country) {
                console.warn(`[Row ${index}] Missing name or country:`, uni);
            }

            return doc;
        });

        console.log("Clearing existing colleges from database...");
        const deleteRes = await Institute.deleteMany({});
        console.log(`Cleared ${deleteRes.deletedCount} old records.`);

        console.log("Inserting new normalized records...");
        const insertRes = await Institute.insertMany(normalizedData);
        console.log(`✅ Success! Imported ${insertRes.length} colleges into the database.`);

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error("❌ Import failed with error:", err.message);
        try {
            mongoose.connection.close();
        } catch (_) {}
        process.exit(1);
    }
}

importData();
