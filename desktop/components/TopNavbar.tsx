import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Home', path: '/desktop' },
    { name: 'Explore', path: '/desktop/explore' },
    { name: 'Discover', path: '/desktop/discover' },
    { name: 'Profile', path: '/desktop/profile' },
  ];

  const currentPath = location.pathname;

  return (
    <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50 flex-shrink-0">
      <div className="text-2xl font-black text-green-700 cursor-pointer" onClick={() => navigate('/desktop')}>
        UnseenMap
      </div>
      
      <div className="flex gap-8 text-gray-500 font-medium">
        {navItems.map((item) => {
          const isActive = 
            (item.path === '/desktop' && currentPath === '/desktop') ||
            (item.path !== '/desktop' && currentPath.startsWith(item.path));
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "pb-1 transition-colors",
                isActive 
                  ? "text-gray-900 border-b-2 border-green-600" 
                  : "hover:text-gray-900 border-b-2 border-transparent"
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
         {currentPath.startsWith('/desktop/profile') && (
            <button className="bg-green-700 text-white px-4 py-2 text-sm rounded-lg font-medium hover:bg-green-800 transition">
              Add Merchant
            </button>
         )}
         {(currentPath.startsWith('/desktop/explore') || currentPath.startsWith('/desktop/discover')) && (
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80" 
              alt="Profile" 
              className="w-8 h-8 rounded-full cursor-pointer hover:ring-2 hover:ring-green-500 transition" 
              onClick={() => navigate('/desktop/profile')} 
            />
         )}
      </div>
    </nav>
  );
}
