import { Outlet, useLocation } from "react-router-dom";
import HomeNavbar from "../components/HomeNavbar";
import ProfileNavbar from "../components/ProfileNavbar";
import Footer from "../components/Footer";

export default function MainLayout() {
	const location = useLocation();
	
	const isHomePage = location.pathname === '/' || location.pathname === '/dashboard';
	const isPostDetailPage = location.pathname.startsWith('/post/');
	
	return (
		<>
		<div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F2F4F7' }}>
			{!isPostDetailPage && (isHomePage ? <HomeNavbar /> : <ProfileNavbar />)}
			<main className="flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
		</>
	);
}