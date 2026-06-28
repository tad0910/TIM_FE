import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../modules/dashboard/components/Sidebar";
import Footer from "../components/Footer";

export default function MainLayout() {
	const location = useLocation();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	
	const isPostDetailPage = location.pathname.startsWith('/post/');
	
	return (
		<div className="min-h-screen flex flex-col bg-pageBg">
			{!isPostDetailPage && <Navbar onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
			
			<div className="flex-1 w-full flex px-4 sm:px-6 lg:px-8">
				{/* Sidebar - fixed on left for desktop */}
				{!isPostDetailPage && (
					<>
						{/* Desktop Sidebar */}
						<div className="hidden lg:block w-[240px] xl:w-[280px] flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] pt-6">
							<Sidebar />
						</div>

						{/* Mobile Sidebar */}
						<div className={`lg:hidden w-[280px] xl:w-[320px] flex-shrink-0 lg:pr-4 ${isMobileMenuOpen ? 'block fixed inset-0 z-40 bg-pageBg p-4 overflow-y-auto' : 'hidden'}`}>
							{isMobileMenuOpen && (
								<button 
									onClick={() => setIsMobileMenuOpen(false)}
									className="mb-4 lg:hidden text-gray-500 hover:text-gray-900"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							)}
							<div className="pt-6 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto custom-scrollbar">
								<Sidebar />
							</div>
						</div>
					</>
				)}
				
				{/* Main Content */}
				<main className={`flex-1 min-w-0 w-full py-6 px-4 lg:px-6 ${isMobileMenuOpen ? 'hidden lg:block' : 'block'} min-h-screen pb-40`}>
					<Outlet />
				</main>
			</div>
			
			{location.pathname !== '/' && <Footer />}
		</div>
	);
}