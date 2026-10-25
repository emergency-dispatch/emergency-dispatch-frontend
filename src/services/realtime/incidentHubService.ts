import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { API_CONFIG } from '../../config/api';
import type { DispatchAssignmentResponseDto } from '../../types/dispatch';

type Listener = (payload: any) => void;

/** connecting: đang kết nối lần đầu · reconnecting: rớt mạng, đang tự nối lại · disconnected: chưa nối được. */
export type HubStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const STOP_DELAY_MS = 300;
// Lần kết nối đầu thất bại hoặc hết lượt tự nối lại → SignalR không tự thử nữa, client tự thử lại theo chu kỳ.
const RETRY_DELAY_MS = 10000;
type JobAssignedListener = (assignment: DispatchAssignmentResponseDto) => void;

/** Tên sự kiện server → client (EmergencyDispatch.API.Realtime.RealtimeContract). */
export const HubEvents = {
  ReceiveNewIncident: 'ReceiveNewIncident',
  ReceiveIncidentUpdate: 'ReceiveIncidentUpdate',
  ReceiveRescueUnitLocation: 'ReceiveRescueUnitLocation',
  ReceiveJobAssigned: 'ReceiveJobAssigned',
  ReceiveAssignmentStatus: 'ReceiveAssignmentStatus',
  ReceiveTrafficHotspot: 'ReceiveTrafficHotspot',
  ReceiveRescueUnitStatus: 'ReceiveRescueUnitStatus',
  ReceiveIncidentLock: 'ReceiveIncidentLock',
  ReceiveTeamChanged: 'ReceiveTeamChanged',
  ReceiveSettingsChanged: 'ReceiveSettingsChanged',
  ReceiveNotificationRead: 'ReceiveNotificationRead',
  ReceiveOutOfAreaAlert: 'ReceiveOutOfAreaAlert',
  ReceiveSupportDispatched: 'ReceiveSupportDispatched',
  ReceiveIncidentTransferred: 'ReceiveIncidentTransferred',
  ForceLogout: 'ForceLogout',
  ReceiveEscalationAlert: 'ReceiveEscalationAlert',
  ReceiveNotification: 'ReceiveNotification',
} as const;

/**
 * Một kết nối SignalR tới một hub. Server tự cho người dùng vào group theo role
 * (operators / rescuers / admins), nên client chỉ cần đăng ký sự kiện.
 */
class HubClient {
  private connection: HubConnection | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectedListeners = new Set<() => void>();
  private registeredEvents = new Set<string>();
  private startPromise: Promise<boolean> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private status: HubStatus = 'disconnected';
  /** Đã từng kết nối thành công trong phiên này (lần nối sau tính là "nối lại"). */
  private hasConnected = false;
  private statusListeners = new Set<() => void>();

  /** Ngôn ngữ thông báo lỗi của hub (?culture=). null = không gửi (mặc định của server). */
  private culture: string | null = null;

  constructor(private readonly hubPath: string) {}

  private getHubUrl(): string {
    const baseUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
    const query = this.culture ? `?culture=${encodeURIComponent(this.culture)}` : '';
    return `${baseUrl}${this.hubPath}${query}`;
  }

  /** Đổi ngôn ngữ khi đang kết nối → nối lại để server nhận culture mới. Không gọi thì URL giữ như cũ. */
  public setCulture(culture: string | null) {
    if (culture === this.culture) return;
    this.culture = culture;
    if (this.connection) this.stop().then(() => this.start());
  }

  private register(event: string) {
    if (!this.connection || this.registeredEvents.has(event)) return;
    this.registeredEvents.add(event);
    this.connection.on(event, (payload: unknown) => {
      this.listeners.get(event)?.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[${this.hubPath}] Error in ${event} listener:`, err);
        }
      });
    });
  }

  private setStatus(status: HubStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener());
  }

  private scheduleRetry() {
    if (this.retryTimer || this.stopTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.start();
    }, RETRY_DELAY_MS);
  }

  public start(): Promise<boolean> {
    // Vừa unmount rồi mount lại (React StrictMode / đổi trang nhanh) → giữ nguyên kết nối cũ.
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
      return this.startPromise ?? Promise.resolve(true);
    }

    const token = localStorage.getItem(API_CONFIG.TOKEN_KEY);
    if (!token) {
      this.setStatus('disconnected');
      return Promise.resolve(false);
    }

    const connection = new HubConnectionBuilder()
      .withUrl(this.getHubUrl(), {
        accessTokenFactory: () => localStorage.getItem(API_CONFIG.TOKEN_KEY) || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();
    this.connection = connection;
    this.registeredEvents.clear();
    this.listeners.forEach((_, event) => this.register(event));
    connection.onreconnecting(() => this.setStatus('reconnecting'));
    connection.onreconnected(() => {
      this.setStatus('connected');
      this.reconnectedListeners.forEach((listener) => listener());
    });
    connection.onclose(() => {
      // Bị ngắt ngoài ý muốn (hết lượt tự nối lại) — stop() chủ động đã gỡ this.connection trước đó.
      if (this.connection !== connection) return;
      this.connection = null;
      this.setStatus('disconnected');
      this.scheduleRetry();
    });

    const isRetry = this.hasConnected;
    this.setStatus(isRetry ? 'reconnecting' : 'connecting');
    this.startPromise = connection
      .start()
      .then(() => {
        this.setStatus('connected');
        this.hasConnected = true;
        // Nối lại sau một khoảng mất kết nối → báo để tải lại dữ liệu đã lỡ.
        if (isRetry) this.reconnectedListeners.forEach((listener) => listener());
        return true;
      })
      .catch((err) => {
        console.warn(`[${this.hubPath}] SignalR connection failed (will retry, polling meanwhile):`, err);
        if (this.connection === connection) {
          this.connection = null;
          this.setStatus('disconnected');
          this.scheduleRetry();
        }
        return false;
      });
    return this.startPromise;
  }

  /** Ngắt trễ một nhịp để lần start() ngay sau đó (mount lại) dùng tiếp kết nối đang mở. */
  public stop(): Promise<void> {
    if (!this.connection) return Promise.resolve();
    if (this.stopTimer) clearTimeout(this.stopTimer);
    return new Promise((resolve) => {
      this.stopTimer = setTimeout(async () => {
        this.stopTimer = null;
        if (this.retryTimer) {
          clearTimeout(this.retryTimer);
          this.retryTimer = null;
        }
        const connection = this.connection;
        const pendingStart = this.startPromise;
        this.connection = null;
        this.startPromise = null;
        this.registeredEvents.clear();
        this.hasConnected = false;
        this.setStatus('disconnected');
        try {
          // Chờ bắt tay xong rồi mới ngắt, tránh lỗi "stopped during negotiation".
          await pendingStart;
          await connection?.stop();
        } catch {
          // Ignore stop error
        }
        resolve();
      }, STOP_DELAY_MS);
    });
  }

  public isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  public async invoke<T = any>(methodName: string, ...args: any[]): Promise<T | null> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return null;
    }
    return this.connection.invoke<T>(methodName, ...args);
  }

  public getStatus = (): HubStatus => this.status;

  /** Dùng với useSyncExternalStore. */
  public subscribeStatus = (listener: () => void): (() => void) => {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  };

  /** Đăng ký nghe một sự kiện; trả hàm hủy đăng ký. */
  public on<T = any>(event: string, listener: (payload: T) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener);
    this.register(event);
    return () => {
      set.delete(listener as Listener);
    };
  }

  /** Kết nối lại sau khi rớt mạng — nên tải lại dữ liệu vì có thể đã lỡ sự kiện. */
  public onReconnected(listener: () => void): () => void {
    this.reconnectedListeners.add(listener);
    return () => {
      this.reconnectedListeners.delete(listener);
    };
  }

  public onJobAssigned(listener: JobAssignedListener): () => void {
    return this.on(HubEvents.ReceiveJobAssigned, listener);
  }

  public onAssignmentStatus(listener: Listener): () => void {
    return this.on(HubEvents.ReceiveAssignmentStatus, listener);
  }

  public onTrafficHotspot(listener: Listener): () => void {
    return this.on(HubEvents.ReceiveTrafficHotspot, listener);
  }
}

export const incidentHubService = new HubClient('/hubs/incidents');

/** Hub vị trí GPS: Operator nhận ReceiveRescueUnitLocation tại đây (không phát qua /hubs/incidents). */
export const trackingHubService = new HubClient('/hubs/tracking');
