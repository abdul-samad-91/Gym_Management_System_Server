import Member from '../models/Member.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import Plan from '../models/Plan.js';
import Trainer from '../models/Trainer.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1));
    
    // Member statistics
    const [
      totalMembers,
      activeMembers,
      expiredMembers,
      onHoldMembers,
      inactiveMembers,
      newMembersToday,
      newMembersThisMonth
    ] = await Promise.all([
      Member.countDocuments(),
      Member.countDocuments({ membershipStatus: 'Active' }),
      Member.countDocuments({ membershipStatus: 'Expired' }),
      Member.countDocuments({ membershipStatus: 'On Hold' }),
      Member.countDocuments({ membershipStatus: 'Inactive' }),
      Member.countDocuments({ createdAt: { $gte: today } }),
      Member.countDocuments({ createdAt: { $gte: firstDayOfMonth } })
    ]);
    
    // Attendance statistics
    const [
      todayAttendance,
      monthlyAttendance
    ] = await Promise.all([
      Attendance.countDocuments({ date: today }),
      Attendance.countDocuments({ date: { $gte: firstDayOfMonth } })
    ]);
    
    // Payment statistics
    const todayRevenue = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: new Date(today) },
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
    
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: firstDayOfMonth },
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
    
    // Expiring memberships (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const expiringMemberships = await Member.countDocuments({
      planEndDate: {
        $gte: new Date(today),
        $lte: nextWeek
      },
      membershipStatus: 'Active'
    });
    
    // Plan distribution
    const planDistribution = await Member.aggregate([
      {
        $match: { membershipStatus: 'Active', currentPlan: { $ne: null } }
      },
      {
        $group: {
          _id: '$currentPlan',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'plans',
          localField: '_id',
          foreignField: '_id',
          as: 'plan'
        }
      },
      {
        $unwind: '$plan'
      },
      {
        $project: {
          planName: '$plan.planName',
          count: 1
        }
      }
    ]);
    
    // Recent activities
    const recentMembers = await Member.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('memberId fullName photo membershipStatus joinDate currentPlan')
      .populate('currentPlan', 'planName');
    
    const recentPayments = await Payment.find({ paymentStatus: 'Paid' })
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate('member', 'memberId fullName')
      .populate('plan', 'planName');
    
    // Growth trend (last 6 months)
    const growthTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(new Date().setMonth(new Date().getMonth() - i, 1));
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthMembers = await Member.countDocuments({
        joinDate: { $gte: monthStart, $lt: monthEnd }
      });
      
      const monthRevenue = await Payment.aggregate([
        {
          $match: {
            paymentDate: { $gte: monthStart, $lt: monthEnd },
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
      
      growthTrend.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        members: monthMembers,
        revenue: monthRevenue[0]?.total || 0
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        members: {
          total: totalMembers,
          active: activeMembers,
          expired: expiredMembers,
          onHold: onHoldMembers,
          inactive: inactiveMembers,
          newToday: newMembersToday,
          newThisMonth: newMembersThisMonth
        },
        attendance: {
          today: todayAttendance,
          monthly: monthlyAttendance
        },
        revenue: {
          today: todayRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0
        },
        alerts: {
          expiringMemberships
        },
        planDistribution,
        recentMembers,
        recentPayments,
        growthTrend
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get attendance trends
export const getAttendanceTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    
    const attendanceTrend = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: attendanceTrend.map(item => ({
        date: item._id,
        count: item.count
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get revenue trends
export const getRevenueTrends = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    
    const revenueTrend = [];
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const monthStart = new Date(new Date().setMonth(new Date().getMonth() - i, 1));
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthRevenue = await Payment.aggregate([
        {
          $match: {
            paymentDate: { $gte: monthStart, $lt: monthEnd },
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
      
      revenueTrend.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue[0]?.total || 0,
        transactionCount: monthRevenue[0]?.count || 0
      });
    }
    
    res.status(200).json({
      success: true,
      data: revenueTrend
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get member growth
export const getMemberGrowth = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const growthData = [];
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const monthStart = new Date(new Date().setMonth(new Date().getMonth() - i, 1));
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const newMembers = await Member.countDocuments({
        joinDate: { $gte: monthStart, $lt: monthEnd }
      });
      
      const totalMembers = await Member.countDocuments({
        joinDate: { $lt: monthEnd }
      });
      
      growthData.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        newMembers,
        totalMembers
      });
    }
    
    res.status(200).json({
      success: true,
      data: growthData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

