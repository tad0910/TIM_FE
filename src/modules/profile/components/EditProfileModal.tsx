import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "../../../types/profile";
import { updateUserProfile } from "../../../services/profileApi";
import { validateVietnamesePhoneNumber, getPhoneCarrier } from "../../../utils/phoneValidation";
import { queryKeys } from "../../../hooks/api/queryKeys";

interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updatedProfile: UserProfile) => void;
}

export default function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    phoneNumber: profile.phoneNumber || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phoneNumber: profile.phoneNumber || ''
    });
  }, [profile.firstName, profile.lastName, profile.phoneNumber]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name không được để trống";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name không được để trống";
    }

    if (formData.phoneNumber.trim()) {
      const phoneValidation = validateVietnamesePhoneNumber(formData.phoneNumber);
      if (!phoneValidation.isValid) {
        newErrors.phoneNumber = phoneValidation.error || "Số điện thoại không hợp lệ";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      console.log('Updating profile for user:', profile.userId);
      
      let formattedPhoneNumber = formData.phoneNumber;
      if (formData.phoneNumber.trim()) {
        const phoneValidation = validateVietnamesePhoneNumber(formData.phoneNumber);
        if (phoneValidation.isValid && phoneValidation.formattedNumber) {
          formattedPhoneNumber = phoneValidation.formattedNumber;
        }
      }
      
      const backendData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formattedPhoneNumber,
        email: profile.email,
        username: profile.username
      };
      
      console.log('Sending to backend:', backendData);
      const updatedProfile = await updateUserProfile(profile.userId.toString(), backendData);
      console.log('Profile updated successfully:', updatedProfile);
      
      // Invalidate profile queries to trigger refetch in sidebar and other components
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.detail(profile.userId.toString())
      });
      // Also invalidate getUserById query used in sidebar
      queryClient.invalidateQueries({
        queryKey: ['user', 'byId', profile.userId.toString()]
      });
      
      onSave({
        ...updatedProfile,
        firstName: backendData.firstName ?? updatedProfile.firstName,
        lastName: backendData.lastName ?? updatedProfile.lastName,
        phoneNumber: backendData.phoneNumber ?? updatedProfile.phoneNumber
      });
    } catch (error) {
      console.error('Update profile failed:', error);
      alert('Có lỗi xảy ra khi cập nhật hồ sơ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    
    if (field === 'phoneNumber' && value.trim()) {
      const phoneValidation = validateVietnamesePhoneNumber(value);
      if (!phoneValidation.isValid) {
        setErrors(prev => ({ ...prev, phoneNumber: phoneValidation.error || "Số điện thoại không hợp lệ" }));
      } else {
        setErrors(prev => ({ ...prev, phoneNumber: "" }));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Chỉnh sửa hồ sơ</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập first name"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập last name"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập số điện thoại (VD: 0987654321)"
              />
              {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
              {formData.phoneNumber && !errors.phoneNumber && (
                <div className="mt-1">
                  <p className="text-green-600 text-xs">
                    ✓ Số điện thoại hợp lệ
                  </p>
                  <p className="text-blue-600 text-xs">
                    📱 Nhà mạng: {getPhoneCarrier(formData.phoneNumber)}
                  </p>
                </div>
              )}
            </div>



            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
