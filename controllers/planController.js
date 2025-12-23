import Plan from '../models/Plan.js';
import Member from '../models/Member.js';

// Get all plans
export const getPlans = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    let query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const plans = await Plan.find(query).sort({ price: 1 });
    
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single plan
export const getPlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    // Get member count for this plan
    const memberCount = await Member.countDocuments({ currentPlan: plan._id, membershipStatus: 'Active' });
    
    res.status(200).json({
      success: true,
      data: {
        ...plan.toObject(),
        activeMemberCount: memberCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create plan
export const createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update plan
export const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete plan
export const deletePlan = async (req, res) => {
  try {
    // Check if any active members have this plan
    const membersWithPlan = await Member.countDocuments({
      currentPlan: req.params.id,
      membershipStatus: 'Active'
    });
    
    if (membersWithPlan > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. ${membersWithPlan} active member(s) are currently using this plan.`
      });
    }
    
    const plan = await Plan.findByIdAndDelete(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle plan status
export const togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    plan.isActive = !plan.isActive;
    await plan.save();
    
    res.status(200).json({
      success: true,
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully`,
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get plan statistics
export const getPlanStatistics = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true });
    
    const statistics = await Promise.all(
      plans.map(async (plan) => {
        const activeMemberCount = await Member.countDocuments({
          currentPlan: plan._id,
          membershipStatus: 'Active'
        });
        
        const totalMemberCount = await Member.countDocuments({
          currentPlan: plan._id
        });
        
        return {
          plan: {
            id: plan._id,
            name: plan.planName,
            price: plan.price,
            duration: plan.duration
          },
          activeMemberCount,
          totalMemberCount
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

