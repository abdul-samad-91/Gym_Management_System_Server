import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  checkInTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  date: {
    type: Date,
    required: true,
    default: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
  },
  attendanceType: {
    type: String,
    enum: ['Manual', 'Biometric'],
    default: 'Manual'
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  biometricDeviceId: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Present', 'Checked Out'],
    default: 'Present'
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate check-ins on same day
attendanceSchema.index({ member: 1, date: 1 }, { unique: true });

// Calculate duration
attendanceSchema.virtual('duration').get(function() {
  if (this.checkOutTime) {
    return Math.round((this.checkOutTime - this.checkInTime) / (1000 * 60)); // minutes
  }
  return null;
});

export default mongoose.model('Attendance', attendanceSchema);

