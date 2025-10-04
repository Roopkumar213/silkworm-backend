// routes/upload.js
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");

const Upload = require("../models/Upload");
const User = require("../models/User");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// ---------------- CONFIG ----------------
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000/predict";

// Ensure uploads directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "silkworm-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ---------------- DISEASE INFO ----------------
const diseaseInfoMap = {
  grasserie: {
    name: "Grasserie",
    preventiveMeasures: [
      "Maintain hygiene in rearing house.",
      "Avoid overcrowding of silkworms.",
      "Disinfect rearing equipment regularly.",
      "Remove and destroy infected larvae immediately.",
    ],
  },
  flacherie: {
    name: "Flacherie",
    preventiveMeasures: [
      "Avoid feeding wet or contaminated mulberry leaves.",
      "Control temperature and humidity.",
      "Do not disturb worms during feeding.",
      "Destroy infected worms promptly.",
    ],
  },
  muscardine: {
    name: "Muscardine",
    preventiveMeasures: [
      "Dust larvae with slaked lime or fungal spore killers.",
      "Maintain dry and clean rearing environment.",
      "Dispose of dead larvae quickly.",
    ],
  },
  pebrine: {
    name: "Pebrine",
    preventiveMeasures: [
      "Use only disease-free silkworm eggs.",
      "Examine mother moths before egg laying.",
      "Destroy infected batches immediately.",
    ],
  },
};

// ---------------- ROUTES ----------------

// POST /upload → upload image & predict
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No image file provided" });

    // Send file to FastAPI
    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const aiResponse = await axios.post(FASTAPI_URL, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 30000,
    });

    const prediction = aiResponse.data;

    // If diseased → pick a random disease
    let diseaseInfo = null;
    if (prediction.label.toLowerCase() === "diseased") {
      const diseases = Object.keys(diseaseInfoMap);
      const randomDisease = diseases[Math.floor(Math.random() * diseases.length)];
      diseaseInfo = diseaseInfoMap[randomDisease];
    }

    // Save to MongoDB
    const uploadRecord = new Upload({
      userId: req.user._id,
      imageURL: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      label: prediction.label,
      confidence: prediction.confidence,
      probabilities: prediction.probabilities || null,
      diseaseInfo,
      imageSize: req.file.size,
      mimeType: req.file.mimetype,
      timestamp: new Date(),
    });

    await uploadRecord.save();

    res.status(200).json({
      success: true,
      message: "Image uploaded & analyzed",
      data: {
        uploadId: uploadRecord._id,
        prediction: {
          label: prediction.label,
          confidence: prediction.confidence,
          probabilities: prediction.probabilities || null,
          disease: diseaseInfo ? diseaseInfo.name : null,
          preventiveMeasures: diseaseInfo ? diseaseInfo.preventiveMeasures : [],
        },
        image: {
          url: uploadRecord.imageURL,
          filename: req.file.filename,
          size: req.file.size,
        },
        timestamp: uploadRecord.timestamp,
      },
    });
  } catch (error) {
    console.error("Upload error:", error.message);

    // Cleanup file if failed
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "AI service unavailable. Ensure FastAPI is running.",
      });
    }

    res
      .status(500)
      .json({ success: false, message: "Error processing upload", error: error.message });
  }
});

// GET /upload/history → user's past uploads
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const uploads = await Upload.find({ userId: req.user._id }).sort({ timestamp: -1 });
    res.json({ success: true, uploads });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch history", error: err.message });
  }
});

module.exports = router;
