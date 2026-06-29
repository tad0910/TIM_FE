import { useState } from "react";
import { Link } from "react-router-dom";
import "../../../App.css";
import "../../../global.css";
import CGlogo from "../../../assets/codegymlogo.png";
import BG from "../../../assets/codegym.png";
import UserService from "../services/keycloakService";
import { api } from "../../../services/api";
import { useAuthStore } from "../../../store/useAuthStore";
import { type LoginResponse } from "../services/authApi";

export default function AuthPage() {
  const { login } = useAuthStore();
  const [isSignup, setIsSignup] = useState(false);
  const [activeForm, setActiveForm] = useState<"login" | "signup">("login");
  const [isAnimating, setIsAnimating] = useState(false);
  const [overlayContent, setOverlayContent] = useState<"login" | "signup">("login");
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("remembered_username") !== null;
  });
  const [usernameOrEmail, setUsernameOrEmail] = useState(() => {
    return localStorage.getItem("remembered_username") || "";
  });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    status: "active",
    agreeTerms: false
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [isSigningUp, setIsSigningUp] = useState(false);

  const toggleMode = (signup: boolean) => {
    setIsAnimating(true);
    setTimeout(() => setOverlayContent(signup ? "signup" : "login"), 200);
    setIsSignup(signup);
    setTimeout(() => setActiveForm(signup ? "signup" : "login"), 350);
    setTimeout(() => setIsAnimating(false), 700);
  };

  const handleSSOLogin = () => {
    UserService.doLogin();
  };


  const validateSignupForm = () => {
    const errors: Record<string, string> = {};
    
    if (!signupData.username.trim()) {
      errors.username = "Username là bắt buộc";
    } else if (signupData.username.length < 3) {
      errors.username = "Username phải có ít nhất 3 ký tự";
    }
    
    if (!signupData.email.trim()) {
      errors.email = "Email là bắt buộc";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {
      errors.email = "Email không hợp lệ";
    }
    
    if (!signupData.password) {
      errors.password = "Password is required";
    } else if (signupData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    if (!signupData.agreeTerms) {
      errors.agreeTerms = "You must agree to the terms";
    }
    
    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignupInputChange = (field: string, value: string | boolean) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
    if (signupErrors[field]) {
      setSignupErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignupForm()) {
      return;
    }
    
    setIsSigningUp(true);
    try {
      const signupDataForApi = {
        username: signupData.username,
        email: signupData.email,
        password: signupData.password,
      };
      
      const response = await api.signup(signupDataForApi);
      console.log("Signup response:", response);

      setSignupData({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        status: "active",
        agreeTerms: false
      });
      toggleMode(false);
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
    } catch (error: unknown) {
      console.error("Signup error:", error);
      
      let errorMessage = "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.";
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("HTTP")) {
        const statusCode = errorMsg.match(/HTTP (\d+)/)?.[1];
        if (statusCode === "400") {
          errorMessage = "Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.";
        } else if (statusCode === "409") {
          errorMessage = "Email hoặc username đã tồn tại.";
        } else if (statusCode === "404") {
          errorMessage = "Không tìm thấy API endpoint. Vui lòng kiểm tra backend.";
        } else if (statusCode === "500") {
          errorMessage = "Lỗi server. Vui lòng thử lại sau.";
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const loginResponse = await api.post('/auth/login', {
        usernameOrEmail,
        password
      });

      const { accessToken, refreshToken, user: userInfo } = loginResponse as LoginResponse;

      localStorage.setItem("auth_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("auth_mode", "local");
      
      if (rememberMe) {
        localStorage.setItem("remembered_username", usernameOrEmail);
      } else {
        localStorage.removeItem("remembered_username");
      }

      const user = {
        id: userInfo.id.toString(),
        username: userInfo.username,
        email: userInfo.email,
        role: userInfo.role || 'USER'
      };

      login(user, accessToken, refreshToken);
      
      if (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_GIAO_VIEN') {
        console.log("Local login successful, redirecting to admin dashboard");
        window.location.href = "/admin/dashboard";
      } else {
        console.log("Local login successful, redirecting to homepage");
        window.location.href = "/";
      }
      
    } catch (err: unknown) {
      console.error("Login error:", err);

      if (err instanceof Error) {
        const msg = err.message || "";
        if (msg.includes("Phiên đăng nhập đã hết hạn")) {
          setError("Tên đăng nhập hoặc mật khẩu không đúng");
          return;
        }
      }

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as any;
        const status = axiosError.response?.status;
        const responseData = axiosError.response?.data;
        const serverMessage = responseData?.message || responseData?.error || responseData?.detail;
        
        if (serverMessage && typeof serverMessage === 'string') {
          if (serverMessage.includes("No refresh token available")) {
            setError("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập");
            return;
          } else if (serverMessage.includes("Invalid credentials")) {
            setError("Tên đăng nhập hoặc mật khẩu không đúng");
            return;
          } else if (serverMessage.includes("Account locked") || serverMessage.includes("Account disabled")) {
            setError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên");
            return;
          }
        }
        
        switch (status) {
          case 401:
            setError("Tên đăng nhập hoặc mật khẩu không đúng");
            break;
          case 403:
            setError("Tài khoản của bạn đã bị khóa hoặc không có quyền truy cập");
            break;
          case 409:
            setError("Tài khoản đã tồn tại hoặc có xung đột dữ liệu");
            break;
          case 422:
            setError("Dữ liệu đầu vào không hợp lệ. Vui lòng kiểm tra lại thông tin");
            break;
          case 429:
            setError("Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau");
            break;
          case 500:
            setError("Lỗi server. Vui lòng liên hệ quản trị viên để kiểm tra tài khoản");
            break;
          case 502:
            setError("Server tạm thời không khả dụng. Vui lòng thử lại sau");
            break;
          case 503:
            setError("Dịch vụ đang bảo trì. Vui lòng thử lại sau");
            break;
          case 504:
            setError("Kết nối timeout. Vui lòng kiểm tra kết nối mạng và thử lại");
            break;
          default:
            setError(serverMessage || `Lỗi server (${status}). Vui lòng thử lại sau`);
        }
      } else {
        const errorMsg = err instanceof Error ? err.message : String(err);
        
        if (errorMsg.includes("No refresh token available")) {
          setError("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập");
        } else if (errorMsg.includes("Network Error") || errorMsg.includes("ERR_NETWORK")) {
          setError("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng");
        } else if (errorMsg.includes("timeout")) {
          setError("Kết nối timeout. Vui lòng thử lại sau");
        } else if (errorMsg.includes("Request cancelled")) {
          setError("Yêu cầu đã bị hủy. Vui lòng thử lại");
        } else {
          setError(errorMsg || "Có lỗi xảy ra khi đăng nhập");
        }
      }
    } finally {
      setLoading(false);
    }
  };

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

      <div className="relative w-[1000px] h-[600px] rounded-2xl shadow-2xl overflow-hidden z-10">
        <div
          className={`absolute top-0 left-0 w-1/2 h-full flex items-center justify-center
            transition-all duration-700 ease-in-out
            ${
              isSignup
                ? "-translate-x-full opacity-0"
                : "translate-x-0 opacity-100 z-10"
            }
            bg-white
          `}
        >
          {activeForm === "login" && (
            <form className="w-4/5 max-w-sm space-y-4" onSubmit={handleLogin}>
              <img src={CGlogo} alt="CodeGym Logo" className="h-10 mb-6" />

              <input
                type="text"
                placeholder="Username hoặc Email"
                className="input-style"
                value={usernameOrEmail}
                onChange={e => setUsernameOrEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="input-style"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-indigo-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <button
                className="btn-primary w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
              <button
                type="button"
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={handleSSOLogin}
              >
                <img src="src/assets/iconG.png" className="w-5 h-5" />
                <span>Login with CodeGym ID</span>
              </button>
            </form>
          )}
        </div>

        <div
          className={`absolute top-0 right-0 w-1/2 h-full flex items-center justify-center
            transition-all duration-700 ease-in-out
            ${
              isSignup
                ? "translate-x-0 opacity-100 z-10"
                : "translate-x-full opacity-0"
            }
            bg-white
          `}
        >
          {activeForm === "signup" && (
            <form className="w-4/5 max-w-sm space-y-4" onSubmit={handleSignup}>
              <img src={CGlogo} alt="CodeGym Logo" className="h-10 mb-6" />

              <div>
                <input
                  type="text"
                  placeholder="Username"
                  className={`input-style ${signupErrors.username ? 'border-red-500' : ''}`}
                  value={signupData.username}
                  onChange={(e) => handleSignupInputChange('username', e.target.value)}
                />
                {signupErrors.username && (
                  <p className="text-red-500 text-xs mt-1">{signupErrors.username}</p>
                )}
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className={`input-style ${signupErrors.email ? 'border-red-500' : ''}`}
                  value={signupData.email}
                  onChange={(e) => handleSignupInputChange('email', e.target.value)}
                />
                {signupErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{signupErrors.email}</p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="First Name"
                  className={`input-style ${signupErrors.firstName ? 'border-red-500' : ''}`}
                  value={signupData.firstName}
                  onChange={(e) => handleSignupInputChange('firstName', e.target.value)}
                />
                {signupErrors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{signupErrors.firstName}</p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Last Name"
                  className={`input-style ${signupErrors.lastName ? 'border-red-500' : ''}`}
                  value={signupData.lastName}
                  onChange={(e) => handleSignupInputChange('lastName', e.target.value)}
                />
                {signupErrors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{signupErrors.lastName}</p>
                )}
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className={`input-style ${signupErrors.password ? 'border-red-500' : ''}`}
                  value={signupData.password}
                  onChange={(e) => handleSignupInputChange('password', e.target.value)}
                />
                {signupErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{signupErrors.password}</p>
                )}
              </div>

              <div className="flex items-center text-sm">
                <input
                  type="checkbox"
                  className="accent-indigo-600 mr-2"
                  checked={signupData.agreeTerms}
                  onChange={(e) => handleSignupInputChange('agreeTerms', e.target.checked)}
                />
                <span>
                  I agree with{' '}
                  <Link to="/public/privacy-policy" className="text-indigo-600 hover:underline">
                    Terms and Privacy Policy
                  </Link>
                </span>
              </div>
              {signupErrors.agreeTerms && (
                <p className="text-red-500 text-xs">{signupErrors.agreeTerms}</p>
              )}

              <button 
                type="submit"
                className="btn-primary w-full"
                disabled={isSigningUp}
              >
                {isSigningUp ? "Signing Up..." : "Sign Up"}
              </button>

              <p
                className="text-indigo-600 text-sm underline cursor-pointer"
                onClick={() => toggleMode(false)}
              >
                Already have an account?
              </p>
            </form>
          )}
        </div>
        
        <div
          className={`absolute top-0 left-0 w-1/2 h-full z-30
            flex flex-col justify-center text-white px-10
            transition-transform duration-700 ease-in-out
            ${isSignup ? "translate-x-0" : "translate-x-full"}
            bg-indigo-700/80 backdrop-blur-sm
          `}
        >
          <div
            className={`transition-opacity duration-300 ${
              isAnimating ? "opacity-0" : "opacity-100"
            }`}
          >
            {overlayContent === "signup" ? (
              <>
                <div className="flex items-center mb-6 text-lg font-bold">
                  <img src="/src/assets/logoTIM.png" className="h-10 mr-2" />
                </div>
                <h1 className="text-4xl font-bold mb-4">Hello, welcome</h1>
                <p className="mb-6 text-sm max-w-xs">
                  Cầu nối giữa CodeGym và học viên về mọi mặt, nơi cung cấp
                  thông tin và tương tác nhằm mang lại môi trường học tập và
                  hoạt động năng suất nhất.
                </p>
                <button
                  onClick={() => toggleMode(false)}
                  className="btn-outline"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center mb-6 text-lg font-bold">
                  <img src="/src/assets/logoTIM.png" className="h-10 mr-2" />
                </div>
                <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
                <p className="mb-6 text-sm max-w-xs">
                  Cầu nối giữa CodeGym và học viên về mọi mặt, nơi cung cấp
                  thông tin và tương tác nhằm mang lại môi trường học tập và
                  hoạt động năng suất nhất.
                </p>
                <button
                  onClick={() => toggleMode(true)}
                  className="btn-outline bottom-[180px] right-[150px] absolute"
                >
                  Create a new account?
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}