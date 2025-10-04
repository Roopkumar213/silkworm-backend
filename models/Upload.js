// models/Upload.js
const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageURL: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  label: {
    type: String,
    enum: ['Healthy', 'Diseased'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  probabilities: {
    Healthy: Number,
    Diseased: Number
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Optional: Store additional metadata
  imageSize: {
    type: Number // in bytes
  },
  mimeType: {
    type: String
  },
  // Optional: Location data if available
  location: {
    latitude: Number,
    longitude: Number,
    village: String
  },
  // Optional: Farmer notes
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for faster queries
uploadSchema.index({ userId: 1, timestamp: -1 });
uploadSchema.index({ label: 1, confidence: -1 });

// Virtual for getting user details
uploadSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Method to get summary statistics
uploadSchema.statics.getUserStats = async function(userId) {
  return await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$label',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' }
      }
    }
  ]);
};

module.exports = mongoose.model('Upload', uploadSchema);