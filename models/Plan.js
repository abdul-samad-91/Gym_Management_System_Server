import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  planName: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  duration: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['days', 'months'],
      default: 'months'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  accessType: {
    type: [String],
    enum: ['Gym', 'Classes', 'Personal Training', 'Spa', 'Swimming'],
    default: ['Gym']
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  features: [{
    type: String
  }]
}, {
  timestamps: true
});

// Calculate final price after discount
planSchema.virtual('finalPrice').get(function() {
  return this.price - (this.price * this.discount / 100);
});

// Calculate duration in days
planSchema.methods.getDurationInDays = function() {
  if (this.duration.unit === 'months') {
    return this.duration.value * 30;
  }
  return this.duration.value;
};

export default mongoose.model('Plan', planSchema);

