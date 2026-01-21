import Member from '../models/Member.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import Plan from '../models/Plan.js';
import Trainer from '../models/Trainer.js';

// Member reports
export const getMemberReport = async (req, res) => {
  try {
    const { status, startDate, endDate, planId } = req.query;
    
    let query = {};
    
    if (status && status !== 'All') {
      query.membershipStatus = status;
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      query.joinDate = {
        $gte: start,
        $lte: end
      };
    }
    
    if (planId) {
      query.currentPlan = planId;
    }
    
    const members = await Member.find(query)
      .populate('currentPlan', 'planName price duration')
      .populate('assignedTrainer', 'fullName')
      .sort({ joinDate: -1 });
    
    // Calculate statistics
    const statistics = {
      totalMembers: members.length,
      byStatus: {
        active: members.filter(m => m.membershipStatus === 'Active').length,
        expired: members.filter(m => m.membershipStatus === 'Expired').length,
        onHold: members.filter(m => m.membershipStatus === 'On Hold').length,
        inactive: members.filter(m => m.membershipStatus === 'Inactive').length
      },
      byGender: {
        male: members.filter(m => m.gender === 'Male').length,
        female: members.filter(m => m.gender === 'Female').length,
        other: members.filter(m => m.gender === 'Other').length
      }
    };
    
    res.status(200).json({
      success: true,
      data: {
        members,
        statistics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Attendance report
export const getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, memberId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    let query = {
      date: {
        $gte: start,
        $lte: end
      }
    };
    
    if (memberId) {
      query.member = memberId;
    }
    
    const attendance = await Attendance.find(query)
      .populate('member', 'memberId fullName phone currentPlan')
      .populate('markedBy', 'fullName username')
      .sort({ date: -1, checkInTime: -1 });
    
    // Calculate statistics
    const uniqueMembers = attendance.length > 0 
      ? [...new Set(attendance.map(a => a.member?._id?.toString()).filter(Boolean))].length 
      : 0;
    
    const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 1;
    
    const statistics = {
      totalAttendance: attendance.length,
      byType: {
        manual: attendance.filter(a => a.attendanceType === 'Manual').length,
        biometric: attendance.filter(a => a.attendanceType === 'Biometric').length
      },
      uniqueMembers,
      averagePerDay: (attendance.length / daysDiff).toFixed(2)
    };
    
    // Daily breakdown
    const dailyBreakdown = {};
    attendance.forEach(att => {
      const dateStr = new Date(att.date).toISOString().split('T')[0];
      dailyBreakdown[dateStr] = (dailyBreakdown[dateStr] || 0) + 1;
    });
    
    res.status(200).json({
      success: true,
      data: {
        attendance,
        statistics,
        dailyBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Financial report
export const getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod, status } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    let query = {
      paymentDate: {
        $gte: start,
        $lte: end
      }
    };
    
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    
    if (status) {
      query.paymentStatus = status;
    }
    
    const payments = await Payment.find(query)
      .populate('member', 'memberId fullName phone')
      .populate('plan', 'planName duration')
      .populate('receivedBy', 'fullName username')
      .sort({ paymentDate: -1 });
    
    // Calculate statistics
    const totalRevenue = payments.reduce((sum, p) => sum + p.finalAmount, 0);
    const totalDiscount = payments.reduce((sum, p) => sum + (p.amount - p.finalAmount), 0);
    
    const statistics = {
      totalTransactions: payments.length,
      totalRevenue,
      totalDiscount,
      averageTransaction: payments.length > 0 ? (totalRevenue / payments.length).toFixed(2) : 0,
      byMethod: {},
      byStatus: {},
      byPlan: {}
    };
    
    // Group by payment method
    payments.forEach(p => {
      statistics.byMethod[p.paymentMethod] = (statistics.byMethod[p.paymentMethod] || 0) + p.finalAmount;
      statistics.byStatus[p.paymentStatus] = (statistics.byStatus[p.paymentStatus] || 0) + p.finalAmount;
      
      const planName = p.plan?.planName || 'Unknown';
      statistics.byPlan[planName] = (statistics.byPlan[planName] || 0) + p.finalAmount;
    });
    
    res.status(200).json({
      success: true,
      data: {
        payments,
        statistics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Plan report
export const getPlanReport = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    
    const planStats = await Promise.all(
      plans.map(async (plan) => {
        const activeMembers = await Member.countDocuments({
          currentPlan: plan._id,
          membershipStatus: 'Active'
        });
        
        const totalMembers = await Member.countDocuments({
          currentPlan: plan._id
        });
        
        const revenue = await Payment.aggregate([
          {
            $match: {
              plan: plan._id,
              paymentStatus: 'Paid'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$finalAmount' }
            }
          }
        ]);
        
        return {
          plan: {
            id: plan._id,
            name: plan.planName,
            price: plan.price,
            duration: plan.duration,
            accessType: plan.accessType
          },
          activeMembers,
          totalMembers,
          totalRevenue: revenue[0]?.total || 0
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: planStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Trainer report
export const getTrainerReport = async (req, res) => {
  try {
    const trainers = await Trainer.find()
      .populate('assignedMembers', 'memberId fullName membershipStatus')
      .sort({ fullName: 1 });
    
    const trainerStats = trainers.map(trainer => ({
      trainer: {
        id: trainer._id,
        trainerId: trainer.trainerId,
        name: trainer.fullName,
        specialization: trainer.specialization,
        experience: trainer.experience,
        isActive: trainer.isActive
      },
      totalAssignedMembers: trainer.assignedMembers.length,
      activeMembers: trainer.assignedMembers.filter(m => m.membershipStatus === 'Active').length
    }));
    
    res.status(200).json({
      success: true,
      data: trainerStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Expiry alert report
export const getExpiryAlertReport = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + parseInt(days));
    
    const expiringMembers = await Member.find({
      planEndDate: {
        $gte: today,
        $lte: futureDate
      },
      membershipStatus: 'Active'
    })
      .populate('currentPlan', 'planName price')
      .sort({ planEndDate: 1 });
    
    const expiredMembers = await Member.find({
      membershipStatus: 'Expired'
    })
      .populate('currentPlan', 'planName')
      .sort({ planEndDate: -1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: {
        expiring: expiringMembers,
        expired: expiredMembers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Daily summary report
export const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Attendance
    const attendance = await Attendance.countDocuments({ date: targetDate });
    
    // New members
    const newMembers = await Member.countDocuments({
      createdAt: { $gte: targetDate, $lt: nextDay }
    });
    
    // Revenue
    const revenue = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: targetDate, $lt: nextDay },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Expiring today
    const expiringToday = await Member.countDocuments({
      planEndDate: targetDate,
      membershipStatus: 'Active'
    });
    
    res.status(200).json({
      success: true,
      data: {
        date: targetDate,
        attendance,
        newMembers,
        revenue: revenue[0]?.total || 0,
        transactions: revenue[0]?.count || 0,
        expiringToday
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

