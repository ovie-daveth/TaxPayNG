const { body } = require('express-validator');
const { User } = require('../models');
const bcrypt = require('bcryptjs');

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, businessType, taxId, preferences, address } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user fields
    const updateData = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (phone) updateData.phone = phone;
    if (businessType) updateData.business_type = businessType;
    if (taxId) updateData.tax_id = taxId;
    if (preferences) updateData.preferences = { ...user.preferences, ...preferences };
    if (address) updateData.address = address;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          businessType: updatedUser.business_type,
          phone: updatedUser.phone,
          taxId: updatedUser.tax_id,
          preferences: updatedUser.preferences,
          address: updatedUser.address,
          emailVerified: updatedUser.email_verified,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at
        }
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(req.user.id, { password_hash: newPasswordHash });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password is incorrect'
      });
    }

    // Delete user (cascade will handle related records)
    await User.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Validation rules
const updateProfileValidation = [
  body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('businessType').optional().isIn(['freelancer', 'sme', 'individual']).withMessage('Invalid business type'),
  body('taxId').optional().isLength({ min: 1, max: 50 }).withMessage('Tax ID must be between 1 and 50 characters')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
];

const deleteAccountValidation = [
  body('password').notEmpty().withMessage('Password is required for account deletion')
];

module.exports = {
  updateProfile,
  changePassword,
  deleteAccount,
  updateProfileValidation,
  changePasswordValidation,
  deleteAccountValidation
};
