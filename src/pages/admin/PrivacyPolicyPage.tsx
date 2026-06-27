import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const PRIVACY_POLICY_EMBED_URL = `https://docs.google.com/document/d/1bSIYjTsDmmpuCaXN3hl1xAuePxuajsAWCmf1SpGfPQc/preview?tab=t.0`;

const PRIVACY_POLICY_DOWNLOAD_URL = `https://docs.google.com/document/d/1bSIYjTsDmmpuCaXN3hl1xAuePxuajsAWCmf1SpGfPQc/export?format=pdf`;

import Sidebar from '../../modules/dashboard/components/Sidebar';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <Sidebar />
        </div>
        <div className="lg:col-span-9">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                  type="button"
                  aria-label="Quay lại"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Chính sách Bảo mật
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Cập nhật lần cuối: [11-12-2025]
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.open(PRIVACY_POLICY_DOWNLOAD_URL, "_blank")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Tải xuống (PDF)</span>
              </button>
            </div>

            <div className="w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
              <iframe
                src={`${PRIVACY_POLICY_EMBED_URL}&embedded=true`}
                className="w-full h-full border-0"
                style={{
                  backgroundColor: "#f9fafb",
                }}
                title="Chính sách riêng tư"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
