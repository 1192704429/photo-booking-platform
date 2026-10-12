export interface ApiResult<T> {
  code: number;
  msg: string;
  data: T;
}

export interface HomeStyle {
  value: number;
  label: string;
}

export interface HomeTheme {
  title: string;
  subtitle: string;
  coverImage: string;
  styleType: number;
  actionLabel: string;
}

export interface Photographer {
  id: number;
  nickname: string;
  avatar?: string;
  serviceCity?: string;
  city?: string;
  specialtyStyle?: string;
  averageScore?: number | string;
  workYears?: number;
  personalIntro?: string;
  homepageCover?: string;
  appointmentCount?: number;
  photographerType?: number;
}

export interface PhotographyWork {
  id: number;
  photographerId: number;
  workTitle: string;
  coverImage?: string;
  workImages?: string;
  styleType?: number;
  shootLocation?: string;
  workDescription?: string;
  viewCount?: number;
  nickname?: string;
}

export interface PhotographyPackage {
  id: number;
  photographerId: number;
  packageName: string;
  coverImage?: string;
  packageType?: number;
  price?: number | string;
  shootDuration?: number;
  retouchedCount?: number;
  originalCount?: number;
  applicablePeople?: number;
  shootLocation?: string;
  packageContent?: string;
  serviceNotice?: string;
}

export interface OrderReview {
  id: number;
  score?: number | string;
  reviewContent?: string;
  reviewImages?: string;
  nickname?: string;
  createTime?: string;
  replyContent?: string;
}

export interface PhotographerDetail {
  photographer: Photographer;
  works: PhotographyWork[];
  packages: PhotographyPackage[];
  reviews: OrderReview[];
  favorited?: boolean;
}

export interface HomeFeed {
  themes: HomeTheme[];
  styles: HomeStyle[];
  photographers: Photographer[];
  works: PhotographyWork[];
  selectedStyleType?: number | null;
  personalized?: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8088";

const USER_ID_KEY = "photo_booking_user_id";
const TOKEN_KEY = "photo_booking_token";
const USER_NAME_KEY = "photo_booking_nickname";
const USER_AVATAR_KEY = "photo_booking_avatar";
const USER_ROLE_KEY = "photo_booking_role_type";

export function getOptionalUserId(): number | null {
  const raw = localStorage.getItem(USER_ID_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCachedNickname(): string | null {
  return localStorage.getItem(USER_NAME_KEY);
}

export function getCachedAvatar(): string | null {
  return localStorage.getItem(USER_AVATAR_KEY);
}

export function getCachedRoleType(): string | null {
  return localStorage.getItem(USER_ROLE_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getAccessToken() && getOptionalUserId());
}

export function isPhotographer(): boolean {
  return getCachedRoleType() === "photographer";
}

export function saveUserSession(payload: {
  token: string;
  userId: number;
  nickname?: string;
  avatar?: string;
  roleType?: string;
}) {
  localStorage.setItem(TOKEN_KEY, payload.token);
  localStorage.setItem(USER_ID_KEY, String(payload.userId));
  if (payload.nickname) {
    localStorage.setItem(USER_NAME_KEY, payload.nickname);
  }
  if (payload.avatar) {
    localStorage.setItem(USER_AVATAR_KEY, payload.avatar);
  }
  if (payload.roleType) {
    localStorage.setItem(USER_ROLE_KEY, payload.roleType);
  }
}

export function clearUserSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_AVATAR_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!headers.has("Content-Type") && options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", token);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }
  const json = (await response.json()) as ApiResult<T>;
  if (json.code !== 200) {
    const error = new Error(json.msg || "接口错误") as Error & { code?: number };
    error.code = json.code;
    throw error;
  }
  return json.data;
}

export function fetchHomeFeed(styleType?: number | null): Promise<HomeFeed> {
  const params = new URLSearchParams();
  if (styleType != null) params.set("styleType", String(styleType));
  const userId = getOptionalUserId();
  if (userId != null) params.set("userId", String(userId));
  const query = params.toString();
  return request<HomeFeed>(`/home/feed${query ? `?${query}` : ""}`);
}

export function fetchPhotographerDetail(id: number): Promise<PhotographerDetail> {
  const params = new URLSearchParams();
  const userId = getOptionalUserId();
  if (userId != null) params.set("userId", String(userId));
  const query = params.toString();
  return request<PhotographerDetail>(`/photographer/${id}${query ? `?${query}` : ""}`);
}

export async function togglePhotographerFavorite(id: number): Promise<boolean> {
  const data = await request<{ favorited: boolean }>(`/photographer/${id}/favorite`, {
    method: "POST",
  });
  return Boolean(data?.favorited);
}

export async function loginUser(
  username: string,
  password: string,
): Promise<{ roleType?: string }> {
  const data = await request<{
    token: string;
    userId: number;
    nickname?: string;
    avatar?: string;
    roleType?: string;
  }>("/sys_user/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  saveUserSession({
    token: data.token,
    userId: data.userId,
    nickname: data.nickname,
    avatar: data.avatar,
    roleType: data.roleType,
  });
  return { roleType: data.roleType };
}

export interface RegisterPayload {
  username: string;
  password: string;
  nickname: string;
  phone?: string;
  email?: string;
  city?: string;
  gender?: number;
  photographerType?: number;
  serviceCity?: string;
  specialtyStyle?: string;
  workYears?: number;
  personalIntro?: string;
}

export function registerUser(payload: RegisterPayload): Promise<null> {
  return request<null>("/sys_user/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function applyPhotographer(payload: RegisterPayload): Promise<null> {
  return request<null>("/sys_user/photographer-application", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface ChartPoint {
  name: string;
  value: number | string;
}

export interface PhotographerOverview {
  monthAppointmentCount: number;
  monthCompletedOrderCount: number;
  averageScore: number | string;
  reviewCount?: number;
  monthlyTrend: ChartPoint[];
  popularPackages: ChartPoint[];
}

export function fetchPhotographerOverview(): Promise<PhotographerOverview> {
  return request<PhotographerOverview>("/photographer/studio/overview");
}

export interface PhotographerProfile {
  id: number;
  nickname?: string;
  avatar?: string;
  specialtyStyle?: string;
  serviceCity?: string;
  workYears?: number;
  personalIntro?: string;
  averageScore?: number | string;
  appointmentCount?: number;
  completedCount?: number;
}

export interface PhotographerProfileUpdatePayload {
  nickname: string;
  avatar?: string;
  specialtyStyle?: string;
  serviceCity?: string;
  workYears?: number | null;
  personalIntro?: string;
}

export function fetchPhotographerProfile(): Promise<PhotographerProfile> {
  return request<PhotographerProfile>("/photographer/studio/profile");
}

export function updatePhotographerProfile(
  payload: PhotographerProfileUpdatePayload,
): Promise<PhotographerProfile> {
  return request<PhotographerProfile>("/photographer/studio/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface StudioWork {
  id: number;
  photographerId: number;
  workTitle: string;
  coverImage?: string;
  workImages?: string;
  styleType?: number;
  shootLocation?: string;
  workDescription?: string;
  viewCount?: number;
  sortNum?: number;
  status?: number;
  createTime?: string;
}

export interface StudioWorkSavePayload {
  workTitle: string;
  coverImage?: string;
  workImages?: string;
  styleType?: number | null;
  shootLocation?: string;
  workDescription?: string;
  status?: number;
}

export function fetchStudioWorks(params?: {
  keyword?: string;
  styleType?: number | null;
}): Promise<StudioWork[]> {
  const search = new URLSearchParams();
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.styleType != null) search.set("styleType", String(params.styleType));
  const query = search.toString();
  return request<StudioWork[]>(`/photographer/studio/works${query ? `?${query}` : ""}`);
}

export function fetchStudioWork(id: number): Promise<StudioWork> {
  return request<StudioWork>(`/photographer/studio/works/${id}`);
}

export function createStudioWork(payload: StudioWorkSavePayload): Promise<StudioWork> {
  return request<StudioWork>("/photographer/studio/works", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStudioWork(
  id: number,
  payload: StudioWorkSavePayload,
): Promise<StudioWork> {
  return request<StudioWork>(`/photographer/studio/works/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteStudioWork(id: number): Promise<void> {
  return request<void>(`/photographer/studio/works/${id}`, {
    method: "DELETE",
  });
}

export interface StudioPackage {
  id: number;
  photographerId: number;
  packageName: string;
  coverImage?: string;
  packageType?: number;
  price?: number | string;
  shootDuration?: number;
  retouchedCount?: number;
  originalCount?: number;
  applicablePeople?: number;
  shootLocation?: string;
  packageContent?: string;
  serviceNotice?: string;
  appointmentCount?: number;
  status?: number;
  createTime?: string;
}

export interface StudioPackageSavePayload {
  packageName: string;
  coverImage?: string;
  packageType?: number | null;
  price: number;
  shootDuration?: number | null;
  retouchedCount?: number | null;
  originalCount?: number | null;
  applicablePeople?: number | null;
  shootLocation?: string;
  packageContent?: string;
  serviceNotice?: string;
  status?: number;
}

export function fetchStudioPackages(keyword?: string): Promise<StudioPackage[]> {
  const search = new URLSearchParams();
  if (keyword?.trim()) search.set("keyword", keyword.trim());
  const query = search.toString();
  return request<StudioPackage[]>(
    `/photographer/studio/packages${query ? `?${query}` : ""}`,
  );
}

export function fetchStudioPackage(id: number): Promise<StudioPackage> {
  return request<StudioPackage>(`/photographer/studio/packages/${id}`);
}

export function createStudioPackage(
  payload: StudioPackageSavePayload,
): Promise<StudioPackage> {
  return request<StudioPackage>("/photographer/studio/packages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStudioPackage(
  id: number,
  payload: StudioPackageSavePayload,
): Promise<StudioPackage> {
  return request<StudioPackage>(`/photographer/studio/packages/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteStudioPackage(id: number): Promise<void> {
  return request<void>(`/photographer/studio/packages/${id}`, {
    method: "DELETE",
  });
}

export interface StudioScheduleSlot {
  scheduleId: number;
  scheduleDate: string;
  startSlot: string;
  endSlot: string;
  scheduleStatus: number;
  locked: boolean;
  statusLabel: string;
  scheduleNote?: string;
}

export interface StudioScheduleCalendar {
  month: string;
  slotsByDate: Record<string, StudioScheduleSlot[]>;
  datesWithSlots: string[];
  unavailableDates: string[];
  bookedDates: string[];
}

export interface StudioScheduleDaySavePayload {
  scheduleDate: string;
  dayUnavailable?: boolean;
  slots?: Array<{
    startSlot: string;
    endSlot: string;
    scheduleStatus: number;
  }>;
}

export function fetchStudioSchedules(month?: string): Promise<StudioScheduleCalendar> {
  const search = new URLSearchParams();
  if (month?.trim()) search.set("month", month.trim());
  const query = search.toString();
  return request<StudioScheduleCalendar>(
    `/photographer/studio/schedules${query ? `?${query}` : ""}`,
  );
}

export function saveStudioScheduleDay(
  payload: StudioScheduleDaySavePayload,
): Promise<StudioScheduleCalendar> {
  return request<StudioScheduleCalendar>("/photographer/studio/schedules/day", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface StudioOrderProgress {
  progressType?: number;
  progressTitle?: string;
  progressDescription?: string;
  operatorRole?: string;
  createTime?: string;
}

export interface StudioOrderDelivery {
  id: number;
  deliveryNo?: string;
  sampleImages?: string;
  retouchedImages?: string;
  originalFiles?: string;
  deliveryDescription?: string;
  retouchedCount?: number;
  deliveryStatus?: number;
  confirmTime?: string;
  createTime?: string;
}

export interface StudioOrder {
  id: number;
  orderNo?: string;
  applyId?: number;
  userId?: number;
  userName?: string;
  packageId?: number;
  packageName?: string;
  packagePrice?: number | string;
  shootDate?: string;
  startSlot?: string;
  endSlot?: string;
  shootLocation?: string;
  contactName?: string;
  contactPhone?: string;
  peopleCount?: number;
  shootRequirement?: string;
  orderStatus?: number;
  photographerConfirmStatus?: number;
  applyStatus?: number;
  statusKey?: string;
  statusLabel?: string;
  createTime?: string;
  shootFinishTime?: string;
  deliveryTime?: string;
  finishTime?: string;
  cancelReason?: string;
  photographerReply?: string;
  canAccept?: boolean;
  canReject?: boolean;
  canUpdateProgress?: boolean;
  canSubmitDelivery?: boolean;
  nextProgressAction?: string;
  progress?: StudioOrderProgress[];
  deliveries?: StudioOrderDelivery[];
}

export function fetchStudioOrders(params?: {
  status?: string;
  shootDateStart?: string;
  shootDateEnd?: string;
}): Promise<StudioOrder[]> {
  const search = new URLSearchParams();
  if (params?.status?.trim()) search.set("status", params.status.trim());
  if (params?.shootDateStart?.trim()) search.set("shootDateStart", params.shootDateStart.trim());
  if (params?.shootDateEnd?.trim()) search.set("shootDateEnd", params.shootDateEnd.trim());
  const query = search.toString();
  return request<StudioOrder[]>(`/photographer/studio/orders${query ? `?${query}` : ""}`);
}

export function fetchStudioOrder(id: number): Promise<StudioOrder> {
  return request<StudioOrder>(`/photographer/studio/orders/${id}`);
}

export function acceptStudioOrder(id: number): Promise<StudioOrder> {
  return request<StudioOrder>(`/photographer/studio/orders/${id}/accept`, {
    method: "POST",
    body: "{}",
  });
}

export function rejectStudioOrder(
  id: number,
  photographerReply?: string,
): Promise<StudioOrder> {
  return request<StudioOrder>(`/photographer/studio/orders/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ photographerReply: photographerReply ?? "" }),
  });
}

export function advanceStudioOrderProgress(
  id: number,
  payload?: {
    progressNote?: string;
    deliveryDescription?: string;
    sampleImages?: string;
    retouchedImages?: string;
    retouchedCount?: number;
  },
): Promise<StudioOrder> {
  return request<StudioOrder>(`/photographer/studio/orders/${id}/progress`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export interface StudioShootCalendar {
  month: string;
  shootDates: string[];
  ordersByDate: Record<string, StudioOrder[]>;
}

export function fetchStudioShootCalendar(month?: string): Promise<StudioShootCalendar> {
  const search = new URLSearchParams();
  if (month?.trim()) search.set("month", month.trim());
  const query = search.toString();
  return request<StudioShootCalendar>(
    `/photographer/studio/shoot-calendar${query ? `?${query}` : ""}`,
  );
}

export interface StudioReviewItem {
  id: number;
  reviewNo?: string;
  orderId?: number;
  orderNo?: string;
  userId?: number;
  userName?: string;
  score?: number | string;
  reviewContent?: string;
  reviewImages?: string;
  anonymousStatus?: number;
  anonymous?: boolean;
  replyContent?: string;
  createTime?: string;
}

export interface StudioReviewsData {
  averageScore: number | string;
  reviewCount: number;
  reviews: StudioReviewItem[];
}

export function fetchStudioReviews(params?: {
  score?: number | null;
  anonymousStatus?: number | null;
}): Promise<StudioReviewsData> {
  const search = new URLSearchParams();
  if (params?.score != null) search.set("score", String(params.score));
  if (params?.anonymousStatus != null) {
    search.set("anonymousStatus", String(params.anonymousStatus));
  }
  const query = search.toString();
  return request<StudioReviewsData>(
    `/photographer/studio/reviews${query ? `?${query}` : ""}`,
  );
}

export interface UserProfile {
  id: number;
  username?: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  city?: string;
  gender?: number;
  roleType?: string;
  favoriteStyle?: string;
}

export function fetchCurrentUser(): Promise<UserProfile> {
  return request<UserProfile>("/sys_user/me").then((profile) => {
    if (profile.roleType) {
      localStorage.setItem("photo_booking_role_type", profile.roleType);
    }
    if (profile.nickname) {
      localStorage.setItem("photo_booking_nickname", profile.nickname);
    }
    if (profile.avatar) {
      localStorage.setItem("photo_booking_avatar", profile.avatar);
    }
    return profile;
  });
}

export function fetchMyFavoritePhotographers(): Promise<Photographer[]> {
  return request<Photographer[]>("/photographer/favorites");
}

export interface PhotographerPage {
  records: Photographer[];
  total: number;
  current: number;
  size: number;
}

export interface PhotographerMeta {
  cities: string[];
  styles: HomeStyle[];
}

export function fetchPhotographerMeta(): Promise<PhotographerMeta> {
  return request<PhotographerMeta>("/photographer/meta");
}

export function fetchPhotographerPage(params: {
  current?: number;
  size?: number;
  keyword?: string;
  serviceCity?: string;
  styleType?: number | null;
}): Promise<PhotographerPage> {
  const search = new URLSearchParams();
  search.set("current", String(params.current ?? 1));
  search.set("size", String(params.size ?? 10));
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params.serviceCity?.trim()) search.set("serviceCity", params.serviceCity.trim());
  if (params.styleType != null) search.set("styleType", String(params.styleType));
  return request<PhotographerPage>(`/photographer/page?${search.toString()}`);
}

export const STYLE_LABELS: Record<number, string> = {
  1: "个人写真",
  2: "情侣写真",
  3: "毕业写真",
  4: "古风写真",
  5: "旅拍",
  6: "婚礼跟拍",
  7: "商业摄影",
  8: "其他",
};

export function formatSpecialty(raw?: string): string {
  if (!raw) return "风格待完善";
  return raw
    .split(/[,，、/|]+/)
    .map((part) => {
      const token = part.trim();
      const asNum = Number(token);
      if (Number.isFinite(asNum) && STYLE_LABELS[asNum]) {
        return STYLE_LABELS[asNum];
      }
      return token;
    })
    .filter(Boolean)
    .join(" · ");
}

export function formatScore(score?: number | string): string {
  if (score == null || score === "") return "暂无评分";
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(n)) return "暂无评分";
  return n.toFixed(1);
}

export function formatPrice(price?: number | string): string {
  if (price == null || price === "") return "价格面议";
  const n = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(n)) return "价格面议";
  return `¥${n.toFixed(2)}`;
}

export function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export interface ScheduleSlot {
  scheduleId: number;
  scheduleDate: string;
  startSlot: string;
  endSlot: string;
  scheduleStatus: number;
  selectable: boolean;
  statusLabel: string;
}

export interface AppointmentPrepare {
  photographer: Photographer;
  photographyPackage: PhotographyPackage;
}

export interface AppointmentCalendar {
  slotsByDate: Record<string, ScheduleSlot[]>;
  availableDates: string[];
}

export interface AppointmentSubmitPayload {
  photographerId: number;
  packageId: number;
  scheduleId: number;
  shootLocation: string;
  contactName: string;
  contactPhone: string;
  peopleCount?: number;
  requirementNote?: string;
}

export interface AppointmentSubmitResult {
  orderId: number;
  orderNo: string;
  applyId: number;
  applyNo: string;
}

export interface PayResponse {
  orderNo: string;
  /** 微信为二维码短链，支付宝为自动提交表单 HTML。 */
  payData: string;
}

export interface OrderProgressItem {
  progressType: number;
  progressTitle?: string;
  progressDescription?: string;
  operatorRole?: string;
  createTime?: string;
}

export interface OrderDeliveryItem {
  id: number;
  deliveryNo?: string;
  sampleImages?: string;
  retouchedImages?: string;
  originalFiles?: string;
  deliveryDescription?: string;
  retouchedCount?: number;
  deliveryStatus?: number;
  confirmTime?: string;
  createTime?: string;
}

export interface OrderDetail {
  id: number;
  orderNo: string;
  applyId?: number;
  userId?: number;
  photographerId: number;
  photographerName?: string;
  photographerAvatar?: string;
  packageId: number;
  packageName?: string;
  packagePrice?: number | string;
  shootDate?: string;
  startSlot?: string;
  endSlot?: string;
  shootLocation?: string;
  contactName?: string;
  contactPhone?: string;
  peopleCount?: number;
  shootRequirement?: string;
  orderStatus?: number;
  photographerConfirmStatus?: number;
  userConfirmStatus?: number;
  applyStatus?: number;
  statusKey: string;
  statusLabel: string;
  createTime?: string;
  shootFinishTime?: string;
  deliveryTime?: string;
  finishTime?: string;
  cancelReason?: string;
  progress: OrderProgressItem[];
  deliveries: OrderDeliveryItem[];
  reviewed: boolean;
  canPay: boolean;
  canConfirmDelivery: boolean;
  canReview: boolean;
}

export interface OrderReviewPrepare {
  orderId: number;
  orderNo: string;
  photographerId: number;
  photographerName?: string;
  photographerAvatar?: string;
  packageId: number;
  packageName?: string;
  packagePrice?: number | string;
  shootDate?: string;
  startSlot?: string;
  endSlot?: string;
  shootLocation?: string;
  finishTime?: string;
}

export interface OrderReviewSubmitPayload {
  score: number;
  reviewContent: string;
  reviewImages: string;
  anonymousStatus: number;
}

export interface UserOrderSummary {
  id: number;
  orderNo: string;
  photographerId: number;
  photographerName?: string;
  packageId: number;
  packageName?: string;
  packagePrice?: number | string;
  shootDate?: string;
  startSlot?: string;
  endSlot?: string;
  shootLocation?: string;
  peopleCount?: number;
  orderStatus?: number;
  photographerConfirmStatus?: number;
  userConfirmStatus?: number;
  applyStatus?: number;
  statusKey: string;
  statusLabel: string;
  createTime?: string;
}

export function fetchAppointmentPrepare(
  photographerId: number,
  packageId: number,
): Promise<AppointmentPrepare> {
  const params = new URLSearchParams({
    photographerId: String(photographerId),
    packageId: String(packageId),
  });
  return request<AppointmentPrepare>(`/appointment/prepare?${params.toString()}`);
}

export function fetchAppointmentCalendar(
  photographerId: number,
  month: string,
): Promise<AppointmentCalendar> {
  const params = new URLSearchParams({
    photographerId: String(photographerId),
    month,
  });
  return request<AppointmentCalendar>(`/appointment/calendar?${params.toString()}`);
}

export function submitAppointment(
  payload: AppointmentSubmitPayload,
): Promise<AppointmentSubmitResult> {
  return request<AppointmentSubmitResult>("/appointment/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchOrderDetail(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/appointment/order/${orderId}`);
}

export function prepayOrder(
  orderNo: string,
  channel: 1 | 2,
): Promise<PayResponse> {
  return request<PayResponse>("/pay/prepay-order", {
    method: "POST",
    body: JSON.stringify({ orderNo, channel, payMethod: "PC" }),
  });
}

export function confirmOrderDelivery(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/appointment/order/${orderId}/confirm-delivery`, {
    method: "POST",
  });
}

export function fetchOrderReviewPrepare(orderId: number): Promise<OrderReviewPrepare> {
  return request<OrderReviewPrepare>(`/appointment/order/${orderId}/review`);
}

export function submitOrderReview(
  orderId: number,
  payload: OrderReviewSubmitPayload,
): Promise<void> {
  return request<void>(`/appointment/order/${orderId}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function uploadUserFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  return request<string>("/upload/file/url", {
    method: "POST",
    body,
  });
}

export interface ComplaintSubmitPayload {
  targetUserId?: number;
  orderId?: number;
  complaintType: number;
  complaintContent: string;
  evidenceImages?: string;
}

export function submitComplaint(payload: ComplaintSubmitPayload): Promise<null> {
  return request<null>("/user/complaints", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMyOrders(status?: string): Promise<UserOrderSummary[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const query = params.toString();
  return request<UserOrderSummary[]>(
    `/appointment/order/list${query ? `?${query}` : ""}`,
  );
}
