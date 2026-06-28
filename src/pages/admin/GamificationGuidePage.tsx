import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const GOOGLE_DOC_URL =
  'https://docs.google.com/document/d/1wr3hdOovGfHBF2lVFaVMvEu0Kj97nYklw_tpIR5ykw0/preview';

const GOOGLE_DOC_DOWNLOAD_URL =
  'https://docs.google.com/document/d/1wr3hdOovGfHBF2lVFaVMvEu0Kj97nYklw_tpIR5ykw0/export?format=pdf';

export default function GamificationGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="w-full mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 max-w-5xl mx-auto">
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
              <h1 className="text-xl font-bold text-gray-900">Hướng dẫn Gamification</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Hướng dẫn công việc triển khai Gamification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.open(GOOGLE_DOC_DOWNLOAD_URL, '_blank')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Tải xuống</span>
          </button>
        </div>

        <div className="w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
          <iframe
            src={GOOGLE_DOC_URL}
            className="w-full h-full border-0"
            style={{
              backgroundColor: '#f9fafb'
            }}
            title="Hướng dẫn Gamification"
          />
        </div>
      </div>
    </div>
  );
}
