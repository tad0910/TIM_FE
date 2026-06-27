import { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { api } from "../../../services/api";

interface APIResponse {
  endpoint: string;
  method: string;
  status: number;
  data: any;
  timestamp: string;
}

export default function BackendResponseCard() {
  const { user, isAuthenticated } = useAuthStore();
  const [responses, setResponses] = useState<APIResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testEndpoints = async () => {
    if (!isAuthenticated || !user?.id) return;

    setLoading(true);
    setError(null);
    const newResponses: APIResponse[] = [];

    try {
      try {
        const profileResponse = await api.get(`/profile/${user.id}`);
        newResponses.push({
          endpoint: `/profile/${user.id}`,
          method: 'GET',
          status: 200,
          data: profileResponse,
          timestamp: new Date().toLocaleTimeString()
        });
      } catch (err: any) {
        newResponses.push({
          endpoint: `/profile/${user.id}`,
          method: 'GET',
          status: err.response?.status || 500,
          data: err.message,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      try {
        const postsResponse = await api.get('/posts?size=3');
        newResponses.push({
          endpoint: '/posts',
          method: 'GET',
          status: 200,
          data: postsResponse,
          timestamp: new Date().toLocaleTimeString()
        });
      } catch (err: any) {
        newResponses.push({
          endpoint: '/posts',
          method: 'GET',
          status: err.response?.status || 500,
          data: err.message,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      try {
        const userPostsResponse = await api.get(`/posts/user/${user.id}`);
        newResponses.push({
          endpoint: `/posts/user/${user.id}`,
          method: 'GET',
          status: 200,
          data: userPostsResponse,
          timestamp: new Date().toLocaleTimeString()
        });
      } catch (err: any) {
        newResponses.push({
          endpoint: `/posts/user/${user.id}`,
          method: 'GET',
          status: err.response?.status || 500,
          data: err.message,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      setResponses(newResponses);
    } catch (err) {
      console.error("Error testing endpoints:", err);
      setError("Không thể test các endpoint");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      testEndpoints();
    }
  }, [user?.id, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Vui lòng đăng nhập để test API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">API Responses</h3>
        <button
          onClick={testEndpoints}
          disabled={loading}
          className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test APIs'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {responses.map((response, index) => (
          <div key={index} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  response.status >= 200 && response.status < 300 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {response.status}
                </span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {response.method}
                </span>
              </div>
              <span className="text-xs text-gray-500">{response.timestamp}</span>
            </div>
            
            <div className="text-sm font-mono text-gray-600 mb-2">
              {response.endpoint}
            </div>
            
            <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
              {typeof response.data === 'object' 
                ? JSON.stringify(response.data, null, 2)
                : String(response.data)
              }
            </div>
          </div>
        ))}
      </div>

      {responses.length === 0 && !loading && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Chưa có response nào</p>
        </div>
      )}
    </div>
  );
}
