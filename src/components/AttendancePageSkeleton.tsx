export default function AttendancePageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="h-5 bg-gray-200 rounded w-28 mb-3 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-36 animate-pulse"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
                      <div className="h-3 bg-gray-100 rounded w-28 animate-pulse"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-9 bg-gray-200 rounded w-10 animate-pulse mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="p-6">
            <div className="h-4 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3 border border-gray-200 rounded-lg bg-gray-50 animate-pulse h-16"></div>
              ))}
            </div>
          </div>
          <div className="p-6">
            <div className="h-4 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </th>
                    <th className="px-4 py-2">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </th>
                    <th className="px-4 py-2">
                      <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
