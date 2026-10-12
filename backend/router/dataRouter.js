import express from "express";
import Institute from "../models/dataModels.js";
import authMiddleware from "../auth/auth.js";

const router = express.Router();

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function getLevenshteinDistance(a, b) {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function findClosestCountry(input, countries) {
  const cleanInput = input.trim().toLowerCase();
  if (!cleanInput) return null;
  
  // 1. Check for exact substring match (e.g. "indi" -> "India")
  for (const country of countries) {
    const cleanCountry = country.toLowerCase();
    if (cleanCountry.includes(cleanInput) || cleanInput.includes(cleanCountry)) {
      return country;
    }
  }
  
  // 2. Levenshtein distance suggestion
  let bestMatch = null;
  let minDistance = 4; // Max distance threshold
  
  for (const country of countries) {
    const distance = getLevenshteinDistance(cleanInput, country.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = country;
    }
  }
  
  return bestMatch;
}

router.get("/colleges", authMiddleware, async (req, res) => {
    try {
      const searchTerm = (req.query.search || req.query.q || req.query.query || req.query.country || "").trim();
      const stateFilter = (req.query.state || "").trim();
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      let query = {};
      if (searchTerm) {
        const terms = searchTerm.split(/\s+/).filter(Boolean);
        const andClauses = terms.map(term => {
          const rx = new RegExp(escapeRegex(term), "i");
          return {
            $or: [
              { name: rx },
              { country: rx },
              { state_province: rx },
              { "state-province": rx },
              { domains: rx },
              { web_pages: rx }
            ]
          };
        });
        query = andClauses.length === 1 ? andClauses[0] : { $and: andClauses };
      }

      if (stateFilter) {
        const stateRx = new RegExp(`^${escapeRegex(stateFilter)}$`, "i");
        const stateClause = {
          $or: [
            { state_province: stateRx },
            { "state-province": stateRx }
          ]
        };
        query = Object.keys(query).length > 0 ? { $and: [query, stateClause] } : stateClause;
      }

      // Count total matching records efficiently
      const totalRecords = await Institute.countDocuments(query);
      
      // If a search was performed but no records exist, provide suggestions
      if (totalRecords === 0 && searchTerm) {
        const distinctCountries = await Institute.distinct("country");
        const suggestion = findClosestCountry(searchTerm, distinctCountries);
        if (suggestion) {
          return res.status(404).json({ 
            message: `No colleges found matching "${searchTerm}". Did you mean country "${suggestion}"?` 
          });
        }
        return res.status(404).json({ message: `No colleges found matching "${searchTerm}". Try another search term.` });
      }

      // Fetch distinct states for dropdown population from the matching query
      let distinctStates = [];
      if (totalRecords > 0) {
        const statesHyphen = await Institute.distinct("state-province", query);
        const statesUnder = await Institute.distinct("state_province", query);
        const combined = new Set([...statesHyphen, ...statesUnder].filter(Boolean));
        distinctStates = Array.from(combined).sort();
      }

      // Fetch the paginated dataset
      const colleges = await Institute.find(query)
        .skip(skip)
        .limit(limit)
        .lean();

      // Normalize state_province so frontend always gets a reliable string
      colleges.forEach(col => {
        if (!col.state_province && col["state-province"]) {
          col.state_province = col["state-province"];
        }
      });
      
      const totalPages = Math.ceil(totalRecords / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage,
        hasPrevPage,
        states: distinctStates,
        data: colleges
      });
    } catch (err) {
      console.error("Database query error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

export default router;