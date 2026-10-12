import type { ClientSession } from "@aicp/auth";
import { Avatar, Input } from "antd";
import { type ReactNode, useMemo, useState } from "react";

import { OperationsHeader } from "../../shared/operations-header";
import { AdminPageLayout } from "../../shared/shell";
import "./chat.css";

interface ChatUser {
  userId: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  hasUnread: boolean;
}

interface ChatMessage {
  content: string;
  createTime: string;
  fromCustomer: boolean;
}

const seedUsers: ChatUser[] = [
  { userId: "u1", name: "客户甲", lastMessage: "你好，想咨询一下", lastTime: "10:21", hasUnread: true },
  { userId: "u2", name: "客户乙", lastMessage: "订单已经收到", lastTime: "09:08", hasUnread: false },
  { userId: "u3", name: "客户丙", lastMessage: "明天再联系", lastTime: "昨天", hasUnread: false },
];

const seedMessages: Record<string, ChatMessage[]> = {
  u1: [
    { content: "你好，想咨询一下", createTime: "10:21", fromCustomer: true },
    { content: "请说，我在。", createTime: "10:22", fromCustomer: false },
  ],
  u2: [{ content: "订单已经收到", createTime: "09:08", fromCustomer: true }],
  u3: [{ content: "明天再联系", createTime: "昨天", fromCustomer: true }],
};

export function NestedChatPage({
  session,
  tenantSlug,
  onLogout,
}: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const [searchText, setSearchText] = useState("");
  const [currentId, setCurrentId] = useState("u1");
  const [messages, setMessages] = useState(seedMessages);
  const [inputMessage, setInputMessage] = useState("");

  const users = useMemo(
    () => seedUsers.filter((user) => user.name.includes(searchText.trim())),
    [searchText],
  );
  const currentUser = seedUsers.find((user) => user.userId === currentId) ?? seedUsers[0];
  const currentMessages = messages[currentId] ?? [];

  function sendMessage(): void {
    const content = inputMessage.trim();
    if (!content || !currentUser) return;
    const next: ChatMessage = {
      content,
      createTime: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      fromCustomer: false,
    };
    setMessages((current) => ({
      ...current,
      [currentUser.userId]: [...(current[currentUser.userId] ?? []), next],
    }));
    setInputMessage("");
  }

  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <OperationsHeader title="聊天 Demo" description="对应原模板客服聊天页，会话数据为本地演示。" />
      <div className="chat-shell">
        <aside className="chat-list">
          <Input
            placeholder="搜索客户"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
          />
          <div className="chat-users">
            {users.map((user) => (
              <button
                key={user.userId}
                type="button"
                className={`chat-user${user.userId === currentId ? " is-active" : ""}`}
                onClick={() => setCurrentId(user.userId)}
              >
                <Avatar>{user.name.slice(0, 1)}</Avatar>
                <span>
                  <strong>
                    {user.name}
                    {user.hasUnread ? <i className="chat-dot" /> : null}
                  </strong>
                  <small>{user.lastMessage}</small>
                </span>
                <em>{user.lastTime}</em>
              </button>
            ))}
          </div>
        </aside>
        <section className="chat-pane">
          <header>
            <strong>{currentUser?.name}</strong>
            <small>{session.account.loginName} · 在线</small>
          </header>
          <div className="chat-messages">
            {currentMessages.map((message, index) => (
              <div
                key={`${message.createTime}-${index}`}
                className={`chat-bubble${message.fromCustomer ? " is-in" : " is-out"}`}
              >
                <p>{message.content}</p>
                <time>{message.createTime}</time>
              </div>
            ))}
          </div>
          <Input.TextArea
            rows={4}
            value={inputMessage}
            placeholder="按回车键发送消息"
            onChange={(event) => setInputMessage(event.target.value)}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
          />
        </section>
      </div>
    </AdminPageLayout>
  );
}
