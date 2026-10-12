import {
  CalendarOutlined,
  CameraOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Card, List, Space, Tag, Typography } from "antd";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  clearUserSession,
  fetchCurrentUser,
  getCachedAvatar,
  getCachedNickname,
  getOptionalUserId,
  isPhotographer,
  isLoggedIn,
  type UserProfile,
} from "../../api";
import "./mine.css";

const { Title, Text } = Typography;

const MINE_PATH = "/mine";
const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(MINE_PATH)}`;
}

function maskPhone(phone?: string): string {
  if (!phone) return "未绑定手机号";
  const digits = phone.replace(/\s+/g, "");
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function genderLabel(gender?: number): string | null {
  if (gender === 1) return "男";
  if (gender === 2) return "女";
  return null;
}

export function MinePage(): ReactNode {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(loginRedirect(), { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchCurrentUser()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          clearUserSession();
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        setError(err.message || "用户信息加载失败");
        setProfile({
          id: getOptionalUserId() ?? 0,
          nickname: getCachedNickname() ?? "约拍用户",
          avatar: getCachedAvatar() ?? undefined,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function handleLogout() {
    clearUserSession();
    void navigate("/login?redirect=%2Fmine", { replace: true });
  }

  const displayName = profile?.nickname || getCachedNickname() || "约拍用户";
  const avatar = profile?.avatar || getCachedAvatar() || FALLBACK_AVATAR;
  const gender = genderLabel(profile?.gender);

  return (
    <main className="mine-page">
      <Card className="mine-hero">
        <Text className="mine-brand">约拍 · MINE</Text>
        <div className="mine-user">
          <Avatar size={72} src={avatar} shape="square" />
          <div className="mine-user-meta">
            <Title level={3}>{loading ? "加载中…" : displayName}</Title>
            <Text>{maskPhone(profile?.phone)}</Text>
            <Space size={[8, 8]} wrap style={{ marginTop: 8 }}>
              {profile?.city ? <Tag>{profile.city}</Tag> : null}
              {gender ? <Tag>{gender}</Tag> : null}
              <Tag color="cyan">ID {profile?.id || getOptionalUserId() || "-"}</Tag>
            </Space>
          </div>
        </div>
      </Card>

      {error ? (
        <Card size="small">
          <Text type="danger">{error}</Text>
        </Card>
      ) : null}

      <Card className="mine-menu-card">
        <List
          itemLayout="horizontal"
          dataSource={[
            ...(isPhotographer() ? [{
              key: "studio",
              to: "/overview",
              title: "摄影师工作台",
              desc: "发布作品、管理套餐和处理预约",
              icon: <CameraOutlined />,
            }] : []),
            {
              key: "orders",
              to: "/orders",
              title: "我的预约",
              desc: "查看预约订单与拍摄进度",
              icon: <CalendarOutlined />,
            },
            {
              key: "favorites",
              to: "/favorites",
              title: "我的收藏",
              desc: "收藏的摄影师列表",
              icon: <HeartOutlined />,
            },
            {
              key: "complaint",
              to: "/complaint",
              title: "申诉与举报",
              desc: "提交问题反馈并查看平台处理",
              icon: <SafetyCertificateOutlined />,
            },
          ]}
          renderItem={(item) => (
            <List.Item>
              <Link to={item.to} className="mine-menu-link">
                <List.Item.Meta
                  avatar={<span className="mine-menu-icon">{item.icon}</span>}
                  title={item.title}
                  description={item.desc}
                />
                <RightOutlined />
              </Link>
            </List.Item>
          )}
        />
      </Card>

      <Button danger block size="large" onClick={handleLogout}>
        退出登录
      </Button>
    </main>
  );
}
