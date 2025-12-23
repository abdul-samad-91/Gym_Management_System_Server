import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';

// Mark attendance (check-in)
export const markAttendance = async (req, res) => {
  try {
    const { memberId, attendanceType = 'Manual', biometricDeviceId, notes } = req.body;
    
    // Find member
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Check if member is active
    if (member.membershipStatus !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark attendance. Member status is ${member.membershipStatus}`
      });
    }
    
    // Check if already checked in today
    const today = new Date().setHours(0, 0, 0, 0);
    const existingAttendance = await Attendance.findOne({
      member: memberId,
      date: today
    });
    
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today'
      });
    }
    
    // Create attendance record
    const attendance = await Attendance.create({
      member: memberId,
      checkInTime: new Date(),
      date: today,
      attendanceType,
      biometricDeviceId,
      notes,
      markedBy: attendanceType === 'Manual' ? req.user.id : null
    });
    
    await attendance.populate('member', 'memberId fullName photo');
    
    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark checkout
export const markCheckout = async (req, res) => {
  try {
    const { attendanceId } = req.body;
    
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out'
      });
    }
    
    attendance.checkOutTime = new Date();
    attendance.status = 'Checked Out';
    await attendance.save();
    
    await attendance.populate('member', 'memberId fullName photo');
    
    res.status(200).json({
      success: true,
      message: 'Checkout marked successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get today's attendance
export const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.find({ date: today })
      .populate('member', 'memberId fullName photo currentPlan')
      .sort({ checkInTime: -1 });
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get attendance by date range
export const getAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }
    
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    
    const attendance = await Attendance.find({
      date: { $gte: start, $lte: end }
    })
      .populate('member', 'memberId fullName photo')
      .sort({ date: -1, checkInTime: -1 });
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get member attendance history
export const getMemberAttendance = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { limit = 30 } = req.query;
    
    const attendance = await Attendance.find({ member: memberId })
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    const totalAttendance = await Attendance.countDocuments({ member: memberId });
    
    // Calculate attendance percentage for current month
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyAttendance = await Attendance.countDocuments({
      member: memberId,
      date: { $gte: firstDayOfMonth }
    });
    
    const daysInMonth = new Date().getDate();
    const attendancePercentage = ((monthlyAttendance / daysInMonth) * 100).toFixed(2);
    
    res.status(200).json({
      success: true,
      data: {
        attendance,
        statistics: {
          totalAttendance,
          monthlyAttendance,
          attendancePercentage
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Biometric attendance sync
export const syncBiometricAttendance = async (req, res) => {
  try {
    const { biometricData } = req.body;
    // biometricData is an array of { biometricId, timestamp, deviceId }
    
    if (!Array.isArray(biometricData) || biometricData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid biometric data'
      });
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const data of biometricData) {
      try {
        const { biometricId, timestamp, deviceId } = data;
        
        // Find member by biometric ID
        const member = await Member.findOne({ biometricId });
        
        if (!member) {
          results.failed.push({
            biometricId,
            reason: 'Member not found'
          });
          continue;
        }
        
        // Check if member is active
        if (member.membershipStatus !== 'Active') {
          results.failed.push({
            biometricId,
            memberId: member.memberId,
            reason: `Member status is ${member.membershipStatus}`
          });
          continue;
        }
        
        const attendanceDate = new Date(timestamp).setHours(0, 0, 0, 0);
        
        // Check if already exists
        const existingAttendance = await Attendance.findOne({
          member: member._id,
          date: attendanceDate
        });
        
        if (existingAttendance) {
          results.failed.push({
            biometricId,
            memberId: member.memberId,
            reason: 'Attendance already marked'
          });
          continue;
        }
        
        // Create attendance
        const attendance = await Attendance.create({
          member: member._id,
          checkInTime: new Date(timestamp),
          date: attendanceDate,
          attendanceType: 'Biometric',
          biometricDeviceId: deviceId
        });
        
        results.success.push({
          biometricId,
          memberId: member.memberId,
          memberName: member.fullName,
          attendanceId: attendance._id
        });
      } catch (error) {
        results.failed.push({
          biometricId: data.biometricId,
          reason: error.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Biometric sync completed',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get attendance statistics
export const getAttendanceStatistics = async (req, res) => {
  try {
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
    
    const [todayCount, yesterdayCount, weekCount, monthCount] = await Promise.all([
      Attendance.countDocuments({ date: today }),
      Attendance.countDocuments({ date: yesterday }),
      Attendance.countDocuments({ date: { $gte: weekAgo } }),
      Attendance.countDocuments({ date: { $gte: monthAgo } })
    ]);
    
    // Peak hours analysis
    const todayAttendance = await Attendance.find({ date: today });
    const hourlyDistribution = {};
    
    todayAttendance.forEach(att => {
      const hour = new Date(att.checkInTime).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });
    
    res.status(200).json({
      success: true,
      data: {
        today: todayCount,
        yesterday: yesterdayCount,
        lastWeek: weekCount,
        lastMonth: monthCount,
        hourlyDistribution
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

