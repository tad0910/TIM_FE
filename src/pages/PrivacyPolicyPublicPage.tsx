import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import CGlogo from '../assets/codegymlogo.png';

const PRIVACY_POLICY_EMBED_URL = 
  `https://docs.google.com/document/d/1bSIYjTsDmmpuCaXN3hl1xAuePxuajsAWCmf1SpGfPQc/preview?tab=t.0`;

const PRIVACY_POLICY_DOWNLOAD_URL =
  `https://docs.google.com/document/d/1bSIYjTsDmmpuCaXN3hl1xAuePxuajsAWCmf1SpGfPQc/export?format=pdf`;


export default function PrivacyPolicyPublicPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                type="button"
                aria-label="Quay lại"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <img src={CGlogo} alt="CodeGym Logo" className="h-8" />
            </div>

            <button
              type="button"
              onClick={() => window.open(PRIVACY_POLICY_DOWNLOAD_URL, '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>Tải xuống (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="w-full" style={{ height: 'calc(100vh - 180px)', minHeight: '800px' }}>
            <iframe
              src={`${PRIVACY_POLICY_EMBED_URL}&embedded=true`} 
              className="w-full h-full border-0"
              style={{
                backgroundColor: '#f9fafb'
              }}
              title="Chính sách Bảo mật"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
