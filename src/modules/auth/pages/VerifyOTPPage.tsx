import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../../../App.css";
import "../../../global.css";
import CGlogo from "../../../assets/codegymlogo.png";
import BG from "../../../assets/codegym.png";
import { verifyOTP } from "../services/authApi";

export default function VerifyOTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";
  
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);


  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);
  useEffect(() => {
    setCountdown(60);
  }, []);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError("Mã OTP phải có 6 chữ số");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await verifyOTP(email, otp);
      
      if (response.reset_token) {
        localStorage.setItem("resetToken", response.reset_token);
        navigate("/reset-password", { state: { email } });
      } else {
        setError("OTP không hợp lệ");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg || "OTP không đúng hoặc đã hết hạn");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    setError(null);
    
    try {
      const { forgotPassword } = await import("../services/authApi");
      await forgotPassword(email);
      setError(null);
    } catch (err: unknown) {
      setError("Không thể gửi lại OTP. Vui lòng thử lại.");
    }
  };

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
          <h1 className="text-xl font-bold text-gray-900 mb-4">Không tìm thấy email</h1>
          <p className="text-gray-600 mb-6">Vui lòng quay lại trang quên mật khẩu.</p>
          <Link to="/forgot-password" className="btn-primary">
            Quay lại
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Nhập mã OTP</h1>
          <p className="text-gray-600 mb-2">
            Chúng tôi đã gửi mã OTP 6 chữ số đến email
          </p>
          <p className="text-indigo-600 font-medium">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Mã OTP
            </label>
            <input
              type="text"
              id="otp"
              placeholder="Nhập 6 chữ số"
              className="input-style w-full text-center text-2xl tracking-widest"
              value={otp}
              onChange={handleOtpChange}
              maxLength={6}
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Đang xác thực..." : "Xác thực OTP"}
          </button>

          <div className="text-center space-y-2">
            {countdown > 0 ? (
              <p className="text-sm text-gray-500">
                Gửi lại mã sau {countdown} giây
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-indigo-600 hover:underline text-sm"
              >
                Gửi lại mã OTP
              </button>
            )}
            
            <div>
              <Link
                to="/forgot-password"
                className="text-gray-500 hover:underline text-sm"
              >
                Thay đổi email
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
