import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';

// Get all members
export const getMembers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status && status !== 'All') {
      query.membershipStatus = status;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const members = await Member.find(query)
      .populate('currentPlan', 'planName price')
      .populate('assignedTrainer', 'fullName specialization')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Member.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: members.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single member
export const getMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('currentPlan')
      .populate('assignedTrainer');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Get attendance history
    const attendanceHistory = await Attendance.find({ member: member._id })
      .sort({ date: -1 })
      .limit(30);
    
    // Get payment history
    const paymentHistory = await Payment.find({ member: member._id })
      .populate('plan', 'planName')
      .sort({ paymentDate: -1 })
      .limit(10);
    
    res.status(200).json({
      success: true,
      data: {
        member,
        attendanceHistory,
        paymentHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create member
export const createMember = async (req, res) => {
  try {
    const memberData = req.body;
    
    // Handle photo upload
    if (req.file) {
      memberData.photo = `/uploads/${req.file.filename}`;
    }
    
    const member =  new Member(memberData);
    await member.save();
    
    res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      data: member
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update member
export const updateMember = async (req, res) => {
  try {
    const updateData = req.body;
    
    // Handle photo upload
    if (req.file) {
      updateData.photo = `/uploads/${req.file.filename}`;
    }
    
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('currentPlan').populate('assignedTrainer');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete member
export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Assign plan to member
export const assignPlan = async (req, res) => {
  try {
    const { memberId, planId, paymentMethod, discount = 0 } = req.body;
    
    const member = await Member.findById(memberId);
    const plan = await Plan.findById(planId);
    
    if (!member || !plan) {
      return res.status(404).json({
        success: false,
        message: 'Member or Plan not found'
      });
    }
    
    // Calculate dates
    const startDate = new Date();
    const durationInDays = plan.getDurationInDays();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationInDays);
    
    // Update member
    member.currentPlan = plan._id;
    member.planStartDate = startDate;
    member.planEndDate = endDate;
    member.membershipStatus = 'Active';
    await member.save();
    
    // Create payment record
    const finalAmount = plan.price - (plan.price * discount / 100);
    const payment = await Payment.create({
      member: member._id,
      plan: plan._id,
      amount: plan.price,
      discount,
      finalAmount,
      paymentMethod,
      paymentStatus: 'Paid',
      receivedBy: req.user.id
    });
    
    res.status(200).json({
      success: true,
      message: 'Plan assigned successfully',
      data: {
        member,
        payment
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Renew membership
export const renewMembership = async (req, res) => {
  try {
    const { memberId, planId, paymentMethod, discount = 0 } = req.body;
    
    const member = await Member.findById(memberId);
    const plan = await Plan.findById(planId);
    
    if (!member || !plan) {
      return res.status(404).json({
        success: false,
        message: 'Member or Plan not found'
      });
    }
    
    // Calculate new dates
    const startDate = new Date();
    const durationInDays = plan.getDurationInDays();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationInDays);
    
    // Update member
    member.currentPlan = plan._id;
    member.planStartDate = startDate;
    member.planEndDate = endDate;
    member.membershipStatus = 'Active';
    await member.save();
    
    // Create payment record
    const finalAmount = plan.price - (plan.price * discount / 100);
    const payment = await Payment.create({
      member: member._id,
      plan: plan._id,
      amount: plan.price,
      discount,
      finalAmount,
      paymentMethod,
      paymentStatus: 'Paid',
      receivedBy: req.user.id
    });
    
    res.status(200).json({
      success: true,
      message: 'Membership renewed successfully',
      data: {
        member,
        payment
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update membership status
export const updateMembershipStatus = async (req, res) => {
  try {
    const { memberId, status } = req.body;
    
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    member.membershipStatus = status;
    await member.save();
    
    res.status(200).json({
      success: true,
      message: 'Membership status updated successfully',
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get expiring memberships
export const getExpiringMemberships = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));
    
    const expiringMembers = await Member.find({
      planEndDate: {
        $gte: today,
        $lte: futureDate
      },
      membershipStatus: 'Active'
    })
      .populate('currentPlan', 'planName')
      .sort({ planEndDate: 1 });
    
    res.status(200).json({
      success: true,
      count: expiringMembers.length,
      data: expiringMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

