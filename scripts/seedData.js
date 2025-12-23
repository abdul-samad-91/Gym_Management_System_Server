import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/Plan.js';

dotenv.config();

// Script to seed sample membership plans
const seedPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym_management');
    console.log('MongoDB connected');

    // Check if plans already exist
    const existingPlans = await Plan.countDocuments();
    if (existingPlans > 0) {
      console.log('Plans already exist. Skipping seed.');
      process.exit(0);
    }

    // Sample plans
    const plans = [
      {
        planName: 'Basic Monthly',
        duration: { value: 1, unit: 'months' },
        price: 999,
        accessType: ['Gym'],
        description: 'Basic gym access for one month',
        features: [
          'Access to gym equipment',
          'Locker facility',
          'Basic fitness assessment'
        ],
        isActive: true
      },
      {
        planName: 'Standard Quarterly',
        duration: { value: 3, unit: 'months' },
        price: 2499,
        accessType: ['Gym', 'Classes'],
        description: 'Gym and group classes for three months',
        features: [
          'Access to gym equipment',
          'Group fitness classes',
          'Locker facility',
          'Monthly fitness assessment',
          'Diet consultation'
        ],
        isActive: true
      },
      {
        planName: 'Premium Annual',
        duration: { value: 12, unit: 'months' },
        price: 8999,
        accessType: ['Gym', 'Classes', 'Personal Training'],
        description: 'Complete fitness package for one year',
        features: [
          'Access to gym equipment',
          'Group fitness classes',
          'Personal training sessions',
          'Locker facility',
          'Monthly fitness assessment',
          'Customized diet plan',
          'Access to spa (4 sessions)',
          'Free guest pass (2 per month)'
        ],
        isActive: true
      },
      {
        planName: 'Student Monthly',
        duration: { value: 1, unit: 'months' },
        price: 699,
        accessType: ['Gym'],
        description: 'Special student discount plan',
        features: [
          'Access to gym equipment',
          'Locker facility',
          'Student ID required'
        ],
        isActive: true,
        discount: 30
      },
      {
        planName: 'Personal Training Package',
        duration: { value: 1, unit: 'months' },
        price: 3999,
        accessType: ['Gym', 'Personal Training'],
        description: 'Intensive one-on-one training',
        features: [
          'Access to gym equipment',
          '12 personal training sessions',
          'Customized workout plan',
          'Diet guidance',
          'Progress tracking'
        ],
        isActive: true
      }
    ];

    await Plan.insertMany(plans);
    console.log('✅ Sample plans created successfully');
    console.log(`Created ${plans.length} membership plans`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedPlans();

