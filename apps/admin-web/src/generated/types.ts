export type GeneratedFieldType =
  | "input"
  | "textarea"
  | "select"
  | "radio"
  | "image"
  | "file"
  | "date"
  | "number"
  | "rich"
  | "md";

export interface GeneratedOption {
  label: string;
  value: string | number;
}

export interface GeneratedField {
  name: string;
  label: string;
  type: GeneratedFieldType;
  javaType?: string;
  primary?: boolean;
  required?: boolean;
  searchable?: boolean;
  searchType?: "input" | "select" | "date" | "range";
  visible?: boolean;
  editable?: boolean;
  options?: GeneratedOption[];
  optionsEndpoint?: string;
  optionLabelKey?: string;
  optionValueKey?: string;
}

export interface GeneratedTable {
  key: string;
  endpoint: string;
  title: string;
  primaryKey: string;
  fields: GeneratedField[];
}

export interface GeneratedMenu {
  id: string;
  path: string;
  title: string;
  roles?: string[];
  tableKey?: string;
}

export interface GeneratedPersonalCenter {
  key: string;
  fields: Array<{
    fieldName: string;
    fieldLabel: string;
    component?: string;
    disabled?: boolean;
    options?: GeneratedOption[];
  }>;
}

export interface GeneratedChartParam {
  paramName: string;
  paramType?: string;
  componentType?: "timeRange" | "select" | "numberInput" | "textInput";
  label?: string;
  bindGroup?: string;
  defaultValue?: string | number;
  options?: GeneratedOption[];
}

export interface GeneratedChart {
  code: string;
  title: string;
  type: "BasicBarChart" | "BasicLineChart" | "BasicPieChart" | "CircularPieChart" | "FlorenceNightingaleRoseChart";
  roles?: string[];
  params?: GeneratedChartParam[];
}

export interface GeneratedProjectConfig {
  generated: boolean;
  loginTableName: string;
  loginConfig: Record<string, string>;
  menus: GeneratedMenu[];
  tables: Record<string, GeneratedTable>;
  personalCenters: GeneratedPersonalCenter[];
  charts: GeneratedChart[];
}
