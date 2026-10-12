import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import "./studio-layout.css";

const studioLinks = [
  { to: "/overview", label: "数据概览", end: true },
  { to: "/studio/works", label: "作品管理" },
  { to: "/studio/packages", label: "套餐管理" },
  { to: "/studio/schedules", label: "档期管理" },
  { to: "/studio/shoot-calendar", label: "拍摄日历" },
  { to: "/studio/orders", label: "预约订单" },
  { to: "/studio/reviews", label: "用户评价" },
  { to: "/studio/profile", label: "工作室资料" },
];

export function StudioLayout(): ReactNode {
  return (
    <div className="studio-route-shell">
      <header className="studio-header">
        <NavLink to="/overview" className="studio-brand">
          <strong>约拍 · 工作台</strong>
          <span>PHOTOGRAPHER STUDIO</span>
        </NavLink>
        <nav className="studio-nav" aria-label="摄影师工作台导航">
          {studioLinks.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>
          ))}
        </nav>
        <NavLink to="/" className="studio-exit">返回用户端</NavLink>
      </header>
      <Outlet />
    </div>
  );
}
