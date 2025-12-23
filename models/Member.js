import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  memberId: {
    type: String,
    // required: true,
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
  dateOfBirth: {
    type: Date,
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
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  medicalNotes: {
    type: String,
    default: ''
  },
  membershipStatus: {
    type: String,
    enum: ['Active', 'Expired', 'On Hold', 'Inactive'],
    default: 'Active'
  },
  currentPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    default: null
  },
  planStartDate: {
    type: Date
  },
  planEndDate: {
    type: Date
  },
  assignedTrainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    default: null
  },
  biometricId: {
    type: String,
    unique: true,
    sparse: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate unique member ID
memberSchema.pre('save', async function(next) {
  console.log('Generating member ID...');
  if (!this.memberId) {
    const count = await mongoose.model('Member').countDocuments();
    this.memberId = `GYM${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Update membership status based on plan end date
memberSchema.methods.updateMembershipStatus = function() {
  if (this.planEndDate && new Date() > this.planEndDate) {
    this.membershipStatus = 'Expired';
  }
};

export default mongoose.model('Member', memberSchema);

