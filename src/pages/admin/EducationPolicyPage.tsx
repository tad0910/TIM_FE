import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const GOOGLE_DOC_URL = 'https://drive.google.com/file/d/1xMY1dka-mUatA5q04CN-zj2OHF6Q18gP/preview?usp=sharing';
const GOOGLE_DOC_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1xMY1dka-mUatA5q04CN-zj2OHF6Q18gP';

import Sidebar from '../../modules/dashboard/components/Sidebar';

export default function EducationPolicyPage() {
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
                            <h1 className="text-xl font-bold text-gray-900">Chính sách giáo dục</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Quy định và quy chế đào tạo
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => GOOGLE_DOC_DOWNLOAD_URL && window.open(GOOGLE_DOC_DOWNLOAD_URL, '_blank')}
                        disabled={!GOOGLE_DOC_DOWNLOAD_URL}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm transition-colors ${GOOGLE_DOC_DOWNLOAD_URL
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-300 cursor-not-allowed'
                            }`}
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <span>Tải xuống</span>
                    </button>
                </div>

                <div className="w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
                    {GOOGLE_DOC_URL ? (
                        <iframe
                            src={GOOGLE_DOC_URL}
                            className="w-full h-full border-0"
                            style={{
                                backgroundColor: '#f9fafb'
                            }}
                            title="Chính sách giáo dục"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                            <p>Chưa có tài liệu được liên kết</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
