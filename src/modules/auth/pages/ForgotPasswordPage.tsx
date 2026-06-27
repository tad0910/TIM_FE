import { useState } from "react";
import { Link } from "react-router-dom";
import "../../../App.css";
import "../../../global.css";
import CGlogo from "../../../assets/codegymlogo.png";
import BG from "../../../assets/codegym.png";
import { forgotPassword } from "../services/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Vui lòng nhập email");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email không hợp lệ");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
    console.log(email);
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
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Email đã được gửi!</h1>
            <p className="text-gray-600 mb-6">
              Nếu email <strong>{email}</strong> tồn tại trong hệ thống, chúng tôi đã gửi mã OTP 6 chữ số đến hộp thư của bạn.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Vui lòng kiểm tra hộp thư và làm theo hướng dẫn để đặt lại mật khẩu.
            </p>
            
            <Link
              to="/verify-otp"
              state={{ email }}
              className="btn-primary w-full mb-4"
            >
              Nhập mã OTP
            </Link>
            
            <Link
              to="/login"
              className="text-indigo-600 hover:underline text-sm"
            >
              Quay lại đăng nhập
            </Link>
          </div>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quên mật khẩu?</h1>
          <p className="text-gray-600">
            Nhập email của bạn để nhận mã OTP đặt lại mật khẩu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Nhập email của bạn"
              className="input-style w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Đang gửi..." : "Gửi mã OTP"}
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
