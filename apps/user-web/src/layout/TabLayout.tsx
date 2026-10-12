import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { isLoggedIn, isPhotographer } from "../api";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhotographerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.1l1.1-1.6A1 1 0 0 1 9.5 5h5a1 1 0 0 1 .8.4L16.4 7h2.1A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.5c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TabLayout(): ReactNode {
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const photographerLoggedIn = loggedIn && isPhotographer();
  const worksActive = (location.pathname === "/" || location.pathname === "/home")
    && location.hash === "#works";
  const homeActive = (location.pathname === "/" || location.pathname === "/home") && !worksActive;
  const photographerActive = location.pathname.startsWith("/photographers")
    || location.pathname.startsWith("/photographer/");
  const orderActive = location.pathname.startsWith("/orders") || location.pathname.startsWith("/order/");
  const mineActive = location.pathname.startsWith("/mine");

  return (
    <div className="app-shell has-tabs">
      <header className="desktop-header">
        <NavLink to="/" className="desktop-brand" aria-label="约拍首页">
          <span>约拍</span>
          <small>PHOTOGRAPHY BOOKING</small>
        </NavLink>
        <nav className="desktop-nav" aria-label="桌面主导航">
          <NavLink to="/" end>首页</NavLink>
          <NavLink to="/photographers">找摄影师</NavLink>
          <a href="/#works" className={worksActive ? "active" : undefined}>作品灵感</a>
          {loggedIn ? <NavLink to="/orders">我的订单</NavLink> : null}
        </nav>
        <div className="desktop-actions">
          {photographerLoggedIn ? <NavLink to="/overview">工作台</NavLink> : loggedIn ? <NavLink to="/favorites">收藏</NavLink> : <NavLink to="/register?mode=photographer">摄影师入驻</NavLink>}
          <NavLink
            to={loggedIn ? "/mine" : "/login?redirect=%2Fmine"}
            className="desktop-account"
          >
            {loggedIn ? "个人中心" : "登录"}
          </NavLink>
        </div>
      </header>
      <div className="page-scroll">
        <Outlet />
        <footer className="site-footer">
          <div className="site-footer-brand">
            <strong>约拍</strong>
            <span>记录每一束值得珍藏的光</span>
          </div>
          <div className="site-footer-links">
            <NavLink to="/photographers">找摄影师</NavLink>
            <a href="/#works">作品灵感</a>
            {loggedIn ? <NavLink to="/orders">订单中心</NavLink> : null}
            <NavLink to={loggedIn ? "/mine" : "/login?redirect=%2Fmine"}>{loggedIn ? "个人中心" : "登录"}</NavLink>
          </div>
          <p>© {new Date().getFullYear()} 约拍 · Photography Booking</p>
        </footer>
      </div>
      <nav className="tab-bar" aria-label="主导航">
        <NavLink to="/" className={homeActive ? "tab-item active" : "tab-item"} end>
          <HomeIcon />
          首页
        </NavLink>
        <NavLink
          to="/photographers"
          className={photographerActive ? "tab-item active" : "tab-item"}
        >
          <PhotographerIcon />
          摄影师
        </NavLink>
        <NavLink
          to="/orders"
          className={orderActive ? "tab-item active" : "tab-item"}
        >
          <OrderIcon />
          订单
        </NavLink>
        <NavLink to={loggedIn ? "/mine" : "/login?redirect=%2Fmine"} className={mineActive ? "tab-item active" : "tab-item"}>
          <MeIcon />
          {loggedIn ? "我的" : "登录"}
        </NavLink>
      </nav>
    </div>
  );
}
