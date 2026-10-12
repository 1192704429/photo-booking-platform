import type { ClientSession } from "@aicp/auth";
import {
  App as AntApp,
  Button,
  Descriptions,
  Form,
  Modal,
  Popconfirm,
  Space,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AdminPagination } from "../shared/admin-pagination";
import { LedgerSection } from "../shared/ledger-section";
import { OperationsHeader } from "../shared/operations-header";
import { AdminPageLayout } from "../shared/shell";
import { generatedRequest } from "./api";
import { GeneratedFieldControl, renderGeneratedCell } from "./components/field-renderer";
import { generatedProjectConfig } from "./project-config";
import type { GeneratedField, GeneratedMenu, GeneratedOption } from "./types";

import "./crud-page.css";

type Row = Record<string, unknown>;

const detailOnlyMenuIds = new Set([
  "generated-shoot-order",
  "generated-photography-work",
  "generated-photography-package",
  "generated-order-review",
  "generated-complaint-record",
]);
const processMenuIds = new Set(["generated-complaint-record"]);

export function GeneratedCrudPage({
  menu,
  session,
  tenantSlug,
  onLogout,
}: {
  menu: GeneratedMenu;
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const tableConfig = menu.tableKey ? generatedProjectConfig.tables[menu.tableKey] : undefined;
  const detailOnly = detailOnlyMenuIds.has(menu.id);
  const processOnly = processMenuIds.has(menu.id);
  const { message } = AntApp.useApp();
  const [queryForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Row>();
  const [processing, setProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, GeneratedOption[]>>({});

  async function load(nextPage = page, nextSize = pageSize): Promise<void> {
    if (!tableConfig) return;
    setLoading(true);
    try {
      const query = { ...queryForm.getFieldsValue() } as Row;
      Object.keys(query).forEach((key) => {
        const value = query[key];
        if (dayjs.isDayjs(value)) query[key] = value.format("YYYY-MM-DD HH:mm:ss");
        if (Array.isArray(value) && value.length === 2 && value.every(dayjs.isDayjs)) {
          delete query[key];
          query[`${key}Start`] = value[0]!.format("YYYY-MM-DD HH:mm:ss");
          query[`${key}End`] = value[1]!.format("YYYY-MM-DD HH:mm:ss");
        }
      });
      const data = await generatedRequest<{ records?: Row[]; total?: number }>(
        `/${tableConfig.endpoint}/page?current=${nextPage}&size=${nextSize}`,
        "POST",
        query,
      );
      setRows(data?.records ?? []);
      setTotal(Number(data?.total ?? 0));
      setPage(nextPage);
      setPageSize(nextSize);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "加载列表失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1, pageSize);
    if (!tableConfig) return;
    for (const field of tableConfig.fields) {
      if (!field.optionsEndpoint) continue;
      void generatedRequest<Row[]>(field.optionsEndpoint, "POST", {}).then((items) => {
        setDynamicOptions((current) => ({
          ...current,
          [field.name]: (items ?? []).map((item) => ({
            label: String(item[field.optionLabelKey ?? "label"] ?? ""),
            value: String(item[field.optionValueKey ?? "value"] ?? ""),
          })),
        }));
      }).catch(() => undefined);
    }
    // tableConfig is generated and immutable for this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.id]);

  const columns = useMemo<ColumnsType<Row>>(() => {
    if (!tableConfig) return [];
    const configured: ColumnsType<Row> = tableConfig.fields.filter((field) => field.visible).map((field, index) => ({
      title: field.label,
      dataIndex: field.name,
      key: `${field.name}-${index}`,
      ellipsis: true,
      render: (value: unknown) => renderGeneratedCell(field, value, dynamicOptions[field.name]),
    }));
    configured.push({
      title: "操作",
      key: "actions",
      fixed: "right",
      width: 150,
      render: (_value, row) => (
        <Space>
          <Button type="link" onClick={() => openEdit(row, processOnly && Number(row.handleStatus) !== 2)}>{processOnly && Number(row.handleStatus) !== 2 ? "处理" : detailOnly ? "详情" : "编辑"}</Button>
          <Popconfirm title="确认删除这条数据？" onConfirm={() => void removeRows([row[tableConfig.primaryKey]])}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    });
    return configured;
  }, [dynamicOptions, tableConfig]);

  function openEdit(row?: Row, shouldProcess = processOnly): void {
    setEditing(row);
    setProcessing(shouldProcess);
    editForm.resetFields();
    const values = { ...(row ?? {}) };
    for (const field of tableConfig?.fields ?? []) {
      if (field.type === "date" && typeof values[field.name] === "string" && values[field.name]) {
        values[field.name] = dayjs(values[field.name] as string);
      }
    }
    editForm.setFieldsValue(values);
    setModalOpen(true);
  }

  async function save(): Promise<void> {
    if (!tableConfig) return;
    try {
      const values = await editForm.validateFields();
      for (const field of tableConfig.fields) {
        if (field.type === "date" && dayjs.isDayjs(values[field.name])) {
          values[field.name] = values[field.name].format("YYYY-MM-DD HH:mm:ss");
        }
      }
      const payload = { ...(editing ?? {}), ...values };
      await generatedRequest(`/${tableConfig.endpoint}`, editing ? "PUT" : "POST", payload);
      setModalOpen(false);
      void message.success(editing ? "修改成功" : "新增成功");
      await load();
    } catch (error) {
      if (!(error && typeof error === "object" && "errorFields" in error)) {
        void message.error(error instanceof Error ? error.message : "保存失败");
      }
    }
  }

  async function removeRows(values: unknown[]): Promise<void> {
    if (!tableConfig) return;
    const ids = values.filter((value) => value !== undefined && value !== null);
    if (!ids.length) return;
    try {
      if (ids.length === 1) {
        await generatedRequest(`/${tableConfig.endpoint}/${ids[0]}`, "DELETE");
      } else {
        await generatedRequest(`/${tableConfig.endpoint}/batch`, "DELETE", ids);
      }
      setSelectedKeys([]);
      void message.success("删除成功");
      await load();
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  if (!tableConfig) {
    return (
      <AdminPageLayout mainClassName="task-workspace template-workspace" session={session} tenantSlug={tenantSlug} onLogout={onLogout}>
        <OperationsHeader title={menu.title} description="该菜单为自定义页面，请在生成后的项目中补充业务内容。" />
      </AdminPageLayout>
    );
  }

  const searchFields = tableConfig.fields.filter((field) => field.searchable);
  return (
    <AdminPageLayout mainClassName="task-workspace template-workspace" session={session} tenantSlug={tenantSlug} onLogout={onLogout}>
      <OperationsHeader
        title={tableConfig.title}
        description={`管理 ${tableConfig.title} 数据，共 ${total} 条`}
        actions={(
          <Space>
            <Button icon={<RefreshCw size={14} />} onClick={() => void load()}>刷新</Button>
            {!detailOnly ? <Button type="primary" icon={<Plus size={15} />} onClick={() => openEdit()}>新增{tableConfig.title}</Button> : null}
          </Space>
        )}
      />
      <LedgerSection
        className="generated-crud-section"
        aria-label={`${tableConfig.title}数据表格`}
        toolbar={searchFields.length || selectedKeys.length ? (
          <LedgerSection.Toolbar
            filters={searchFields.length ? (
              <Form form={queryForm} layout="inline" className="generated-crud-search">
                {searchFields.map((field, index) => <GeneratedFormItem key={`${field.name}-${index}`} field={field} options={dynamicOptions[field.name]} search />)}
                <Form.Item className="generated-crud-search__actions">
                  <Space size={8}>
                    <Button type="primary" onClick={() => void load(1, pageSize)}>查询</Button>
                    <Button onClick={() => { queryForm.resetFields(); void load(1, pageSize); }}>重置</Button>
                  </Space>
                </Form.Item>
              </Form>
            ) : null}
            actions={!detailOnly && selectedKeys.length ? (
              <Popconfirm title={`确认删除选中的 ${selectedKeys.length} 条数据？`} onConfirm={() => void removeRows(selectedKeys)}>
                <Button danger>批量删除（{selectedKeys.length}）</Button>
              </Popconfirm>
            ) : null}
          />
        ) : null}
        footer={(
          <AdminPagination
            total={total}
            current={page}
            pageSize={pageSize}
            hideOnSinglePage={false}
            onChange={(current, size) => void load(current, size)}
          />
        )}
      >
        <Table<Row>
          className="generated-crud-table"
          size="small"
          rowKey={(row) => String(row[tableConfig.primaryKey])}
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: "max-content" }}
          rowSelection={detailOnly ? undefined : { selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          pagination={false}
        />
      </LedgerSection>
      <Modal
        title={`${processing ? "处理" : detailOnly ? "详情" : editing ? "编辑" : "新增"}${tableConfig.title}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={detailOnly && !processing ? undefined : () => void save()}
        footer={detailOnly && !processing ? <Button onClick={() => setModalOpen(false)}>关闭</Button> : undefined}
        destroyOnHidden
      >
        {detailOnly && !processing ? (
          <Descriptions column={1} bordered size="small" className="generated-detail-descriptions">
            {tableConfig.fields
              .filter((field) => !field.primary && field.visible)
              .map((field, index) => (
                <Descriptions.Item key={`${field.name}-${index}`} label={field.label}>
                  {renderGeneratedCell(field, editing?.[field.name], dynamicOptions[field.name])}
                </Descriptions.Item>
              ))}
          </Descriptions>
        ) : (
          <Form form={editForm} layout="vertical" disabled={detailOnly && !processing}>
            {tableConfig.fields.filter((field) => !field.primary && (detailOnly ? (processing ? ["handleStatus", "handleResult", "handleAdminId", "handleTime"].includes(field.name) : true) : field.editable)).map((field, index) => <GeneratedFormItem key={`${field.name}-${index}`} field={field} options={dynamicOptions[field.name]} />)}
          </Form>
        )}
      </Modal>
    </AdminPageLayout>
  );
}

function GeneratedFormItem({ field, options, search = false }: { field: GeneratedField; options?: GeneratedOption[] | undefined; search?: boolean }): ReactNode {
  const rules = search || !field.required ? undefined : [{ required: true, message: `${field.label}不能为空` }];
  return (
    <Form.Item name={field.name} label={search ? undefined : field.label} {...(rules ? { rules } : {})}>
      <GeneratedFieldControl field={field} options={options} mode={search ? "search" : "edit"} />
    </Form.Item>
  );
}
