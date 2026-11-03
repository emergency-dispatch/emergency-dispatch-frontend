import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_CONFIG } from '@/config/api';

// Giả lập @microsoft/signalr: mỗi build() tạo một FakeConnection để test điều khiển.
const h = vi.hoisted(() => {
  const State = { Disconnected: 'Disconnected', Connecting: 'Connecting', Connected: 'Connected' } as const;
  class FakeConnection {
    state: string = State.Disconnected;
    handlers = new Map<string, (p: unknown) => void>();
    reconnecting?: () => void;
    reconnected?: () => void;
    closed?: () => void;
    startResult: Promise<void> = Promise.resolve();
    constructor(public url: string, public options: { accessTokenFactory: () => string }) {}
    on(event: string, cb: (p: unknown) => void) {
      this.handlers.set(event, cb);
    }
    onreconnecting(cb: () => void) {
      this.reconnecting = cb;
    }
    onreconnected(cb: () => void) {
      this.reconnected = cb;
    }
    onclose(cb: () => void) {
      this.closed = cb;
    }
    start() {
      this.state = State.Connecting;
      return this.startResult.then(() => {
        this.state = State.Connected;
      });
    }
    stop = vi.fn(async () => {
      this.state = State.Disconnected;
    });
    invoke = vi.fn(async (method: string, ...args: unknown[]) => ({ method, args }));
    emit(event: string, payload: unknown) {
      this.handlers.get(event)?.(payload);
    }
  }
  const connections: FakeConnection[] = [];
  let nextStart: Promise<void> | null = null;
  class HubConnectionBuilder {
    url = '';
    options = { accessTokenFactory: () => '' };
    withUrl(url: string, options: { accessTokenFactory: () => string }) {
      this.url = url;
      this.options = options;
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      const c = new FakeConnection(this.url, this.options);
      if (nextStart) {
        c.startResult = nextStart;
        nextStart = null;
      }
      connections.push(c);
      return c;
    }
  }
  return {
    State,
    connections,
    HubConnectionBuilder,
    failNextStart: () => {
      nextStart = Promise.reject(new Error('negotiate failed'));
      nextStart.catch(() => {});
    },
  };
});

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: h.HubConnectionBuilder,
  HubConnectionState: h.State,
  LogLevel: { Warning: 3 },
}));

type HubModule = typeof import('@/services/realtime/incidentHubService');
let mod: HubModule;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  h.connections.length = 0;
  vi.resetModules();
  mod = await import('@/services/realtime/incidentHubService');
});

afterEach(() => {
  vi.useRealTimers();
});

const last = () => h.connections[h.connections.length - 1];

describe('HubClient', () => {
  it('không có token → không kết nối', async () => {
    await expect(mod.incidentHubService.start()).resolves.toBe(false);
    expect(h.connections).toHaveLength(0);
    expect(mod.incidentHubService.getStatus()).toBe('disconnected');
  });

  it('kết nối đúng URL hub (bỏ /api) và dùng token hiện tại', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    const statuses: string[] = [];
    mod.incidentHubService.subscribeStatus(() => statuses.push(mod.incidentHubService.getStatus()));
    await expect(mod.incidentHubService.start()).resolves.toBe(true);
    expect(last().url).toBe('http://api.test/hubs/incidents');
    expect(last().options.accessTokenFactory()).toBe('tok');
    expect(statuses).toEqual(['connecting', 'connected']);
    expect(mod.incidentHubService.isConnected()).toBe(true);
  });

  it('tracking hub dùng đường dẫn riêng', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    await mod.trackingHubService.start();
    expect(last().url).toBe('http://api.test/hubs/tracking');
  });

  it('start lần 2 khi đang kết nối dùng lại kết nối cũ', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    await mod.incidentHubService.start();
    await mod.incidentHubService.start();
    expect(h.connections).toHaveLength(1);
  });

  it('listener đăng ký trước/sau khi kết nối đều nhận sự kiện; lỗi listener không làm hỏng listener khác', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    const before = vi.fn(() => {
      throw new Error('boom');
    });
    const after = vi.fn();
    mod.incidentHubService.on(mod.HubEvents.ReceiveNewIncident, before);
    await mod.incidentHubService.start();
    const off = mod.incidentHubService.on(mod.HubEvents.ReceiveNewIncident, after);
    last().emit('ReceiveNewIncident', { id: 1 });
    expect(before).toHaveBeenCalledWith({ id: 1 });
    expect(after).toHaveBeenCalledWith({ id: 1 });
    off();
    last().emit('ReceiveNewIncident', { id: 2 });
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('helper onJobAssigned / onAssignmentStatus / onTrafficHotspot', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    await mod.incidentHubService.start();
    const fns = [vi.fn(), vi.fn(), vi.fn()];
    mod.incidentHubService.onJobAssigned(fns[0]);
    mod.incidentHubService.onAssignmentStatus(fns[1]);
    mod.incidentHubService.onTrafficHotspot(fns[2]);
    last().emit('ReceiveJobAssigned', 'a');
    last().emit('ReceiveAssignmentStatus', 'b');
    last().emit('ReceiveTrafficHotspot', 'c');
    expect(fns.map((f) => f.mock.calls[0][0])).toEqual(['a', 'b', 'c']);
  });

  it('invoke chỉ chạy khi đã kết nối', async () => {
    await expect(mod.incidentHubService.invoke('Ping')).resolves.toBeNull();
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    await mod.incidentHubService.start();
    await expect(mod.incidentHubService.invoke('Join', 'x')).resolves.toEqual({ method: 'Join', args: ['x'] });
  });

  it('reconnecting / reconnected cập nhật trạng thái và báo listener', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    const onRe = vi.fn();
    mod.incidentHubService.onReconnected(onRe);
    await mod.incidentHubService.start();
    last().reconnecting!();
    expect(mod.incidentHubService.getStatus()).toBe('reconnecting');
    last().reconnected!();
    expect(mod.incidentHubService.getStatus()).toBe('connected');
    expect(onRe).toHaveBeenCalledTimes(1);
  });

  it('kết nối lần đầu thất bại → tự thử lại sau 10s', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    h.failNextStart();
    await expect(mod.incidentHubService.start()).resolves.toBe(false);
    expect(mod.incidentHubService.getStatus()).toBe('disconnected');
    expect(h.connections).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(h.connections).toHaveLength(2);
    expect(mod.incidentHubService.getStatus()).toBe('connected');
  });

  it('bị đóng ngoài ý muốn → thử lại, lần nối sau báo reconnected', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    const onRe = vi.fn();
    mod.incidentHubService.onReconnected(onRe);
    await mod.incidentHubService.start();
    last().closed!();
    expect(mod.incidentHubService.getStatus()).toBe('disconnected');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(h.connections).toHaveLength(2);
    expect(onRe).toHaveBeenCalledTimes(1);
  });

  it('stop ngắt trễ; start ngay sau đó giữ kết nối cũ', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    await mod.incidentHubService.start();
    const conn = last();
    void mod.incidentHubService.stop();
    await mod.incidentHubService.start();
    await vi.advanceTimersByTimeAsync(500);
    expect(conn.stop).not.toHaveBeenCalled();
    expect(h.connections).toHaveLength(1);
  });

  it('stop thật sự ngắt sau 300ms', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    await mod.incidentHubService.start();
    const conn = last();
    const p = mod.incidentHubService.stop();
    await vi.advanceTimersByTimeAsync(300);
    await p;
    expect(conn.stop).toHaveBeenCalled();
    expect(mod.incidentHubService.getStatus()).toBe('disconnected');
    await expect(mod.incidentHubService.stop()).resolves.toBeUndefined();
  });

  it('setCulture thêm ?culture= và nối lại', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
    mod.incidentHubService.setCulture('vi');
    await mod.incidentHubService.start();
    expect(last().url).toBe('http://api.test/hubs/incidents?culture=vi');
    mod.incidentHubService.setCulture('vi'); // không đổi → không làm gì
    mod.incidentHubService.setCulture('en');
    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => expect(h.connections).toHaveLength(2));
    expect(last().url).toBe('http://api.test/hubs/incidents?culture=en');
  });

  it('danh sách sự kiện', () => {
    expect(mod.HubEvents.ForceLogout).toBe('ForceLogout');
    expect(Object.keys(mod.HubEvents).every((k) => mod.HubEvents[k as keyof typeof mod.HubEvents] === k)).toBe(true);
  });
});
