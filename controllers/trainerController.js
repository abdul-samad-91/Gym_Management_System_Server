import Trainer from '../models/Trainer.js';
import Member from '../models/Member.js';

// Get all trainers
export const getTrainers = async (req, res) => {
  try {
    const { isActive, specialization } = req.query;
    
    let query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (specialization) {
      query.specialization = { $in: [specialization] };
    }
    
    const trainers = await Trainer.find(query)
      .populate('assignedMembers', 'memberId fullName phone')
      .sort({ fullName: 1 });
    
    res.status(200).json({
      success: true,
      count: trainers.length,
      data: trainers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single trainer
export const getTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id)
      .populate('assignedMembers', 'memberId fullName phone photo membershipStatus');
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: trainer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create trainer
export const createTrainer = async (req, res) => {
  try {
    const trainerData = req.body;
    
    // Handle photo upload
    if (req.file) {
      trainerData.photo = `/uploads/${req.file.filename}`;
    }
    
    const trainer = await Trainer.create(trainerData);
    // const trainer = new Trainer(trainerData);
    // await trainer.save();
    
    res.status(201).json({
      success: true,
      message: 'Trainer created successfully',
      data: trainer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update trainer
export const updateTrainer = async (req, res) => {
  try {
    const updateData = req.body;
    
    // Handle photo upload
    if (req.file) {
      updateData.photo = `/uploads/${req.file.filename}`;
    }
    
    const trainer = await Trainer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedMembers', 'memberId fullName');
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Trainer updated successfully',
      data: trainer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete trainer
export const deleteTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }
    
    // Unassign members
    await Member.updateMany(
      { assignedTrainer: trainer._id },
      { $unset: { assignedTrainer: 1 } }
    );
    
    await trainer.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Trainer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Assign trainer to member
export const assignTrainerToMember = async (req, res) => {
  try {
    const { trainerId, memberId } = req.body;
    
    const trainer = await Trainer.findById(trainerId);
    const member = await Member.findById(memberId);
    
    if (!trainer || !member) {
      return res.status(404).json({
        success: false,
        message: 'Trainer or Member not found'
      });
    }
    
    // Update member
    member.assignedTrainer = trainer._id;
    await member.save();
    
    // Update trainer
    if (!trainer.assignedMembers.includes(member._id)) {
      trainer.assignedMembers.push(member._id);
      await trainer.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Trainer assigned successfully',
      data: {
        trainer,
        member
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Unassign trainer from member
export const unassignTrainerFromMember = async (req, res) => {
  try {
    const { trainerId, memberId } = req.body;
    
    const trainer = await Trainer.findById(trainerId);
    const member = await Member.findById(memberId);
    
    if (!trainer || !member) {
      return res.status(404).json({
        success: false,
        message: 'Trainer or Member not found'
      });
    }
    
    // Update member
    member.assignedTrainer = null;
    await member.save();
    
    // Update trainer
    trainer.assignedMembers = trainer.assignedMembers.filter(
      m => m.toString() !== member._id.toString()
    );
    await trainer.save();
    
    res.status(200).json({
      success: true,
      message: 'Trainer unassigned successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle trainer status
export const toggleTrainerStatus = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }
    
    trainer.isActive = !trainer.isActive;
    await trainer.save();
    
    res.status(200).json({
      success: true,
      message: `Trainer ${trainer.isActive ? 'activated' : 'deactivated'} successfully`,
      data: trainer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

