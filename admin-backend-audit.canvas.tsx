import { Callout, Card, CardBody, CardHeader, Grid, H1, H2, Pill, Row, Stack, Stat, Table, Text } from "cursor/canvas";

const capabilityRows = [
  ["用户 / 摄影师", "否", "否", "查看、启停账号、摄影师审核、独立重置密码"],
  ["约拍申请", "否", "否", "确认 / 拒绝 / 取消；查看原始申请"],
  ["约拍订单", "否", "否", "受控状态流转、取消与异常处理"],
  ["摄影档期", "否", "受限", "查看；异常时强制关闭 / 解锁并留痕"],
  ["成片交付", "否", "否", "查看、下载、处理交付争议"],
  ["作品 / 套餐", "否", "否", "审核、展示 / 下架；内容由摄影师维护"],
  ["评价", "否", "否", "展示 / 隐藏、违规标记；原文和评分不可改"],
  ["投诉", "否", "仅处理区", "处理状态、结果、处理人、处理时间"],
  ["AI 方案", "否", "否", "查看、归档；生成结果不可人工改写"],
  ["浏览 / 收藏 / 进度日志", "否", "否", "只读、筛选、导出"],
  ["管理员", "仅超级管理员", "受限", "角色 / 状态；密码走单独重置流程"],
];

const issueRows = [
  ["P0", "控件丢失 value/onChange", "输入、下拉、单选、日期、数字无法可靠回显和提交", "全部受控透传，并补组件测试"],
  ["P0", "列表行直接作为编辑详情", "非列表字段可能缺失，编辑数据不完整", "编辑前 GET /{id}，再规范化并回填"],
  ["P0", "权限只到模块", "角色可调用整表 PUT/DELETE，部分写接口未纳入拦截", "后端按资源 × 动作鉴权"],
  ["P0", "通用 CRUD 覆盖业务流程", "前台产生的数据可被后台伪造、篡改或硬删除", "每表声明能力，默认关闭写操作"],
  ["P1", "整行合并后 PUT", "只读、统计、关联展示字段可能被写回", "DTO 白名单，只提交允许字段"],
  ["P1", "枚举与外键类型不统一", "字符串选项与数字数据不匹配，选中态丢失", "配置层统一类型并 normalize"],
  ["P1", "弹窗单列且不限高", "字段、富文本、图片把弹窗拉得又长又高", "桌面双列、正文滚动、头尾固定"],
  ["P1", "字段配置失真", "日期是 input、昵称重复、统计可编辑、密码可回显", "加入敏感 / 计算 / 来源字段元数据"],
  ["P1", "硬删与批量删除普遍开放", "订单、投诉、评价审计链断裂", "改为归档 / 隐藏 / 作废并记录原因"],
  ["P2", "缺少并发和审计", "多人编辑可覆盖，无法追查修改", "乐观锁 + 操作日志 + 状态历史"],
];

export default function AdminBackendAudit() {
  return (
    <Stack gap={20} style={{ maxWidth: 1180, margin: "0 auto", padding: 24 }}>
      <Stack gap={8}>
        <Row gap={10} align="center" wrap><Pill active>后台整改审计</Pill><Pill>基于当前前后端代码</Pill></Row>
        <H1>摄影约拍后台：回显、表单与权限整改清单</H1>
        <Text tone="secondary">结论：不是单页问题，而是通用 CRUD 生成器同时缺少受控表单、业务能力模型和字段级权限。</Text>
      </Stack>
      <Callout tone="danger" title="最先处理的根因">通用字段渲染器没有把表单注入的 value / onChange 传给 Input、Select、Radio、DatePicker 和 InputNumber。这会同时造成编辑不回显、修改值未进入表单，以及查询条件失效。</Callout>
      <Grid columns={4} gap={12}><Stat value="4" label="P0 阻断项" tone="danger" /><Stat value="5" label="P1 高优先项" tone="warning" /><Stat value="11" label="需重定义能力的模块" /><Stat value="3 阶段" label="建议整改节奏" tone="info" /></Grid>
      <Stack gap={10}><H2>按严重级别整改</H2><Table headers={["级别", "问题", "影响", "整改方向"]} rows={issueRows} rowTone={issueRows.map((row) => row[0] === "P0" ? "danger" : row[0] === "P1" ? "warning" : "info")} striped stickyHeader /></Stack>
      <Stack gap={10}><H2>每类数据应该允许什么操作</H2><Text tone="secondary">来源于用户、摄影师或系统流程的数据，后台默认只读；管理动作使用明确的业务按钮，不能继续用整表编辑。</Text><Table headers={["模块", "后台新增", "后台整表编辑", "保留的管理动作"]} rows={capabilityRows} striped stickyHeader /></Stack>
      <Grid columns={3} gap={12}>
        <Card><CardHeader trailing={<Pill size="sm" active>阶段 1</Pill>}>先止血</CardHeader><CardBody><Stack gap={6}><Text>修复控件 value/onChange。</Text><Text>编辑前拉详情并规范化值。</Text><Text>关闭业务表新增、批删和整表编辑。</Text></Stack></CardBody></Card>
        <Card><CardHeader trailing={<Pill size="sm">阶段 2</Pill>}>改业务</CardHeader><CardBody><Stack gap={6}><Text>订单、投诉、审核使用专用动作。</Text><Text>请求 DTO 只接收白名单字段。</Text><Text>权限细化到审核、下架、处理、导出。</Text></Stack></CardBody></Card>
        <Card><CardHeader trailing={<Pill size="sm">阶段 3</Pill>}>提体验</CardHeader><CardBody><Stack gap={6}><Text>双列表单，长文本通栏限高。</Text><Text>只读信息和操作区分组。</Text><Text>补日志、状态历史和乐观锁。</Text></Stack></CardBody></Card>
      </Grid>
      <Callout tone="info" title="建议验收标准">文本、枚举、日期、数字、图片全部正确回显；取消不污染下一条；普通角色无法直接调用接口越权；用户原始内容不可修改；关键状态变更都有操作者、原因和时间。</Callout>
    </Stack>
  );
}
