import { ArrowLeftOutlined, CloudUploadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { isLoggedIn, submitComplaint, uploadUserFile } from "../../api";
import "./complaint.css";

interface ComplaintFormValues {
  complaintType: number;
  complaintContent: string;
  targetUserId?: number;
  orderId?: number;
  evidenceImages?: string;
}

const complaintTypes = [
  { value: 1, label: "服务态度" },
  { value: 2, label: "预约问题" },
  { value: 3, label: "拍摄质量" },
  { value: 4, label: "成片交付" },
  { value: 5, label: "虚假信息" },
  { value: 6, label: "其他" },
];

export function ComplaintPage(): ReactNode {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<ComplaintFormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoggedIn()) {
    void navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
    return null;
  }

  const query = new URLSearchParams(location.search);
  const initialValues: ComplaintFormValues = {
    complaintType: 6,
    orderId: query.get("orderId") ? Number(query.get("orderId")) : undefined,
    targetUserId: query.get("targetUserId") ? Number(query.get("targetUserId")) : undefined,
  };

  const customRequest: UploadProps["customRequest"] = async ({ file, onSuccess, onError }) => {
    if (!(file instanceof File)) return;
    setUploading(true);
    try {
      const url = await uploadUserFile(file);
      const next = [...(form.getFieldValue("evidenceImages") ? String(form.getFieldValue("evidenceImages")).split(",") : []), url].filter(Boolean);
      form.setFieldValue("evidenceImages", next.join(","));
      onSuccess?.(url);
      message.success("图片上传成功");
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("图片上传失败"));
      message.error("图片上传失败");
    } finally {
      setUploading(false);
    }
  };

  function onRemove(file: UploadFile) {
    const url = String(file.response ?? file.url ?? "");
    const next = String(form.getFieldValue("evidenceImages") ?? "").split(",").filter((item) => item && item !== url);
    form.setFieldValue("evidenceImages", next.join(","));
    return true;
  }

  async function onFinish(values: ComplaintFormValues) {
    setSubmitting(true);
    try {
      await submitComplaint(values);
      message.success("投诉已提交");
      void navigate("/mine", { replace: true });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="complaint-page">
      <Link to="/mine" className="complaint-back"><ArrowLeftOutlined /> 返回我的</Link>
      <Card className="complaint-card">
        <div className="complaint-heading">
          <span>FEEDBACK</span>
          <h1>申诉与举报</h1>
          <p>如果在约拍过程中遇到问题，可以提交反馈，我们会尽快核实处理。</p>
        </div>
        <Alert type="info" showIcon message="请尽量描述清楚问题，并上传相关凭证，方便平台核实。" />
        <Form form={form} layout="vertical" initialValues={initialValues} onFinish={(values) => void onFinish(values)}>
          <Form.Item name="targetUserId" hidden>
            <InputNumber />
          </Form.Item>
          <div className="complaint-grid">
            <Form.Item name="complaintType" label="问题类型" rules={[{ required: true, message: "请选择问题类型" }]}>
              <Select options={complaintTypes} />
            </Form.Item>
            <Form.Item name="orderId" label="关联订单号" extra="如与某笔订单有关，请填写订单 ID">
              <InputNumber min={1} className="complaint-full-width" placeholder="选填" />
            </Form.Item>
          </div>
          <Form.Item name="complaintContent" label="问题描述" rules={[{ required: true, whitespace: true, message: "请填写问题描述" }]}>
            <Input.TextArea rows={6} maxLength={1000} showCount placeholder="请描述遇到的问题、时间和具体情况" />
          </Form.Item>
          <Form.Item label="相关凭证" extra="支持 JPG、PNG，最多上传 6 张">
            <Upload listType="picture-card" fileList={fileList} customRequest={customRequest} onChange={({ fileList: next }) => setFileList(next)} onRemove={onRemove} maxCount={6} accept="image/*">
              {fileList.length >= 6 ? null : <span><CloudUploadOutlined /><small>上传图片</small></span>}
            </Upload>
          </Form.Item>
          <Form.Item name="evidenceImages" hidden>
            <Input />
          </Form.Item>
          <Space className="complaint-actions">
            <Button onClick={() => void navigate(-1)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting || uploading}>提交投诉</Button>
          </Space>
        </Form>
      </Card>
    </main>
  );
}
