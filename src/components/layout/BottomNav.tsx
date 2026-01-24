import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Grid3X3, Bookmark, Settings } from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: "/", label: "Discover", icon: Compass },
  { path: "/categories", label: "Categories", icon: Grid3X3 },
  { path: "/saved", label: "Saved", icon: Bookmark },
  { path: "/admin", label: "Admin", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav safe-bottom z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-nav-item relative flex-1 ${isActive ? "active" : ""}`}
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-2 bg-primary/10 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className={`h-6 w-6 relative z-10 ${isActive ? "text-primary" : ""}`} />
              </div>
              <span className={`text-xs mt-1 font-medium ${isActive ? "text-primary" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
