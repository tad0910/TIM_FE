import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../../../App.css";
import "../../../global.css";
import CGlogo from "../../../assets/codegymlogo.png";
import BG from "../../../assets/codegym.png";
import { resetPassword } from "../services/authApi";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";
  
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const resetToken = localStorage.getItem("resetToken");
    if (!resetToken || !email) {
      navigate("/forgot-password");
    }
  }, [navigate, email]);

  const validatePassword = (password: string) => {
    const errors: Record<string, string> = {};
    
    if (password.length < 8) {
      errors.length = "Mật khẩu phải có ít nhất 8 ký tự";
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.uppercase = "Mật khẩu phải có ít nhất 1 chữ hoa";
    }
    
    if (!/[a-z]/.test(password)) {
      errors.lowercase = "Mật khẩu phải có ít nhất 1 chữ thường";
    }
    
    if (!/\d/.test(password)) {
      errors.number = "Mật khẩu phải có ít nhất 1 chữ số";
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.special = "Mật khẩu phải có ít nhất 1 ký tự đặc biệt";
    }
    
    return errors;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === "newPassword") {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
    
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const resetToken = localStorage.getItem("resetToken");
    if (!resetToken) {
      setError("Token đã hết hạn. Vui lòng thử lại từ đầu.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    const passwordValidationErrors = validatePassword(formData.newPassword);
    if (Object.keys(passwordValidationErrors).length > 0) {
      setError("Mật khẩu không đáp ứng yêu cầu bảo mật");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email, resetToken, formData.newPassword);
      
      localStorage.removeItem("resetToken");
      setSuccess(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg || "Có lỗi xảy ra khi đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: `url(${BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        
        <div className="relative w-[500px] bg-white rounded-2xl shadow-2xl p-8 z-10">
          <div className="text-center">
            <img src={CGlogo} alt="CodeGym Logo" className="h-10 mx-auto mb-6" />
            
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Đặt lại mật khẩu thành công!</h1>
            <p className="text-gray-600 mb-6">
              Mật khẩu của bạn đã được cập nhật thành công.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Vui lòng đăng nhập lại với mật khẩu mới.
            </p>
            
            <Link
              to="/login"
              className="btn-primary w-full"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: `url(${BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        
        <div className="relative w-[500px] bg-white rounded-2xl shadow-2xl p-8 z-10 text-center">
          <img src={CGlogo} alt="CodeGym Logo" className="h-10 mx-auto mb-6" />
          <h1 className="text-xl font-bold text-gray-900 mb-4">Phiên không hợp lệ</h1>
          <p className="text-gray-600 mb-6">Vui lòng thực hiện lại quy trình quên mật khẩu.</p>
          <Link to="/forgot-password" className="btn-primary">
            Quên mật khẩu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/30"></div>
      
      <div className="relative w-[500px] bg-white rounded-2xl shadow-2xl p-8 z-10">
        <div className="text-center mb-8">
          <img src={CGlogo} alt="CodeGym Logo" className="h-10 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Đặt lại mật khẩu</h1>
          <p className="text-gray-600">
            Nhập mật khẩu mới cho tài khoản <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu mới
            </label>
            <input
              type="password"
              id="newPassword"
              placeholder="Nhập mật khẩu mới"
              className={`input-style w-full ${passwordErrors.length ? 'border-red-500' : ''}`}
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Nhập lại mật khẩu mới"
              className={`input-style w-full ${formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? 'border-red-500' : ''}`}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              required
            />
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">Mật khẩu xác nhận không khớp</p>
            )}
          </div>

          {formData.newPassword && (
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">Yêu cầu mật khẩu:</p>
              <div className={`${passwordErrors.length ? 'text-red-500' : 'text-green-500'}`}>
                ✓ Ít nhất 8 ký tự
              </div>
              <div className={`${passwordErrors.uppercase ? 'text-red-500' : 'text-green-500'}`}>
                ✓ Ít nhất 1 chữ hoa
              </div>
              <div className={`${passwordErrors.lowercase ? 'text-red-500' : 'text-green-500'}`}>
                ✓ Ít nhất 1 chữ thường
              </div>
              <div className={`${passwordErrors.number ? 'text-red-500' : 'text-green-500'}`}>
                ✓ Ít nhất 1 chữ số
              </div>
              <div className={`${passwordErrors.special ? 'text-red-500' : 'text-green-500'}`}>
                ✓ Ít nhất 1 ký tự đặc biệt
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || Object.keys(passwordErrors).length > 0 || formData.newPassword !== formData.confirmPassword}
          >
            {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-indigo-600 hover:underline text-sm"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
