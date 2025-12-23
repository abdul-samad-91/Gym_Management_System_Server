import mongoose from 'mongoose';

const trainerSchema = new mongoose.Schema({
  trainerId: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  photo: {
    type: String,
    default: null
  },
  specialization: [{
    type: String,
    enum: ['Yoga', 'Cardio', 'Strength Training', 'CrossFit', 'Pilates', 'Zumba', 'Martial Arts', 'Swimming', 'Personal Training']
  }],
  certifications: [{
    name: String,
    issueDate: Date,
    expiryDate: Date
  }],
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  }],
  availability: {
    monday: { available: { type: Boolean, default: true }, hours: String },
    tuesday: { available: { type: Boolean, default: true }, hours: String },
    wednesday: { available: { type: Boolean, default: true }, hours: String },
    thursday: { available: { type: Boolean, default: true }, hours: String },
    friday: { available: { type: Boolean, default: true }, hours: String },
    saturday: { available: { type: Boolean, default: true }, hours: String },
    sunday: { available: { type: Boolean, default: false }, hours: String }
  }
}, {
  timestamps: true
});

// Generate unique trainer ID
trainerSchema.pre('save', async function(next) {
  if (!this.trainerId) {
    const count = await mongoose.model('Trainer').countDocuments();
    this.trainerId = `TRN${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model('Trainer', trainerSchema);

