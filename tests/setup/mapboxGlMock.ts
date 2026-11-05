import { vi } from 'vitest';

// mapbox-gl cần WebGL (jsdom không có) → thay bằng bản giả tối thiểu. Mọi phương thức không khai báo trả `this`
// để gọi chuỗi được; sự kiện `load` / `style.load` chạy ngay khi đăng ký để code khởi tạo layer vẫn chạy.

type Handler = (...args: unknown[]) => void;

function chainable<T extends object>(target: T): T {
  // Cache vi.fn theo tên để test kiểm tra được lời gọi (VD map.flyTo).
  const fns = new Map<PropertyKey, ReturnType<typeof vi.fn>>();
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (prop in obj) return Reflect.get(obj, prop, receiver);
      if (prop === 'then') return undefined; // không phải Promise
      if (!fns.has(prop)) fns.set(prop, vi.fn(() => receiver));
      return fns.get(prop);
    },
  });
}

const interactionHandler = () => ({ enable: vi.fn(), disable: vi.fn(), isEnabled: vi.fn(() => true) });

export class FakeMap {
  static instances: FakeMap[] = [];
  handlers = new Map<string, Handler[]>();
  sources = new Map<string, { setData: ReturnType<typeof vi.fn>; data?: unknown }>();
  layers = new Set<string>();
  container: HTMLElement;
  center = { lng: 0, lat: 0 };
  zoom = 13;
  // Các handler tương tác của mapbox (map.scrollZoom.enable() …).
  scrollZoom = interactionHandler();
  dragPan = interactionHandler();
  dragRotate = interactionHandler();
  doubleClickZoom = interactionHandler();
  touchZoomRotate = interactionHandler();
  touchPitch = interactionHandler();
  keyboard = interactionHandler();
  boxZoom = interactionHandler();
  // Do proxy tạo lúc chạy (vi.fn cache theo tên) — khai báo kiểu để test gọi expect(map.flyTo)….
  declare flyTo: ReturnType<typeof vi.fn>;
  declare easeTo: ReturnType<typeof vi.fn>;
  declare fitBounds: ReturnType<typeof vi.fn>;
  declare remove: ReturnType<typeof vi.fn>;

  constructor(options: { container?: HTMLElement | string; center?: [number, number]; zoom?: number } = {}) {
    this.container = typeof options.container === 'object' && options.container ? options.container : document.createElement('div');
    if (options.center) this.center = { lng: options.center[0], lat: options.center[1] };
    if (options.zoom !== undefined) this.zoom = options.zoom;
    const proxy = chainable(this);
    FakeMap.instances.push(proxy);
    return proxy;
  }

  on(event: string, layerOrHandler: unknown, maybeHandler?: unknown) {
    const handler = (typeof layerOrHandler === 'function' ? layerOrHandler : maybeHandler) as Handler;
    if (!handler) return this;
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    if (event === 'load' || event === 'style.load' || event === 'idle') handler();
    return this;
  }
  once(event: string, handler: Handler) {
    return this.on(event, handler);
  }
  off(event: string, layerOrHandler: unknown, maybeHandler?: unknown) {
    const handler = typeof layerOrHandler === 'function' ? layerOrHandler : maybeHandler;
    this.handlers.set(event, (this.handlers.get(event) ?? []).filter((h) => h !== handler));
    return this;
  }
  /** Test gọi để giả lập sự kiện bản đồ (VD click). */
  fire(event: string, payload?: unknown) {
    (this.handlers.get(event) ?? []).forEach((h) => h(payload));
  }
  addSource(id: string, source: { data?: unknown }) {
    this.sources.set(id, { setData: vi.fn(), data: source?.data });
    return this;
  }
  getSource(id: string) {
    return this.sources.get(id);
  }
  removeSource(id: string) {
    this.sources.delete(id);
    return this;
  }
  addLayer(layer: { id: string }) {
    this.layers.add(layer.id);
    return this;
  }
  getLayer(id: string) {
    return this.layers.has(id) ? { id } : undefined;
  }
  removeLayer(id: string) {
    this.layers.delete(id);
    return this;
  }
  isStyleLoaded() {
    return true;
  }
  loaded() {
    return true;
  }
  getCanvas() {
    return document.createElement('canvas');
  }
  getCanvasContainer() {
    return this.container;
  }
  getContainer() {
    return this.container;
  }
  getCenter() {
    return { ...this.center, toArray: () => [this.center.lng, this.center.lat] };
  }
  getZoom() {
    return this.zoom;
  }
  getBounds() {
    return { contains: () => true, getNorthEast: () => ({ lng: 1, lat: 1 }), getSouthWest: () => ({ lng: 0, lat: 0 }) };
  }
  project() {
    return { x: 0, y: 0 };
  }
  getStyle() {
    return { layers: [...this.layers].map((id) => ({ id })), sources: {} };
  }
}

export class FakeMarker {
  element: HTMLElement;
  lngLat: [number, number] = [0, 0];
  constructor(options?: { element?: HTMLElement } | HTMLElement) {
    const el = options instanceof HTMLElement ? options : options?.element;
    this.element = el ?? document.createElement('div');
    return chainable(this);
  }
  setLngLat(lngLat: [number, number] | { lng: number; lat: number }) {
    this.lngLat = Array.isArray(lngLat) ? lngLat : [lngLat.lng, lngLat.lat];
    return this;
  }
  getLngLat() {
    return { lng: this.lngLat[0], lat: this.lngLat[1] };
  }
  getElement() {
    return this.element;
  }
  addTo(map: FakeMap) {
    map.getContainer().appendChild(this.element);
    return this;
  }
  remove() {
    this.element.remove();
    return this;
  }
}

export class FakePopup {
  constructor() {
    return chainable(this);
  }
  isOpen() {
    return false;
  }
}

export class FakeLngLatBounds {
  points: Array<[number, number]> = [];
  extend(p: [number, number]) {
    this.points.push(p);
    return this;
  }
  isEmpty() {
    return this.points.length === 0;
  }
  getCenter() {
    return { lng: 0, lat: 0 };
  }
}

const mapboxgl = {
  Map: FakeMap,
  Marker: FakeMarker,
  Popup: FakePopup,
  LngLatBounds: FakeLngLatBounds,
  NavigationControl: class {},
  ScaleControl: class {},
  GeolocateControl: class {},
  AttributionControl: class {},
  FullscreenControl: class {},
  supported: () => true,
  accessToken: '',
  config: {} as Record<string, unknown>,
};

export default mapboxgl;
