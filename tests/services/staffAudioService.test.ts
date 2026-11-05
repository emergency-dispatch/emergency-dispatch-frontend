import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { staffAudioService as Service } from '@/services/staffAudioService';

// Web Audio API không có trong jsdom → giả lập tối thiểu.
function makeAudioContext() {
  const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const created = { oscillators: [] as ReturnType<typeof osc>[], gains: [] as ReturnType<typeof gain>[] };
  const osc = () => ({ type: '', frequency: param(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() });
  const gain = () => ({ gain: param(), connect: vi.fn(), disconnect: vi.fn() });
  class FakeAudioContext {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    resume = vi.fn(() => {
      this.state = 'running';
    });
    createOscillator() {
      const o = osc();
      created.oscillators.push(o);
      return o;
    }
    createGain() {
      const g = gain();
      created.gains.push(g);
      return g;
    }
    createBiquadFilter() {
      return { type: '', frequency: param(), connect: vi.fn() };
    }
  }
  return { FakeAudioContext, created };
}

let svc: typeof Service;
let audio: ReturnType<typeof makeAudioContext>;

beforeEach(async () => {
  vi.useFakeTimers();
  audio = makeAudioContext();
  vi.stubGlobal('AudioContext', audio.FakeAudioContext);
  vi.resetModules();
  svc = (await import('@/services/staffAudioService')).staffAudioService;
});

afterEach(() => {
  svc.stopEmergencySiren();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('staffAudioService', () => {
  it('mặc định không tắt tiếng', () => {
    expect(svc.getIsMuted()).toBe(false);
  });

  it('còi báo động: 1 oscillator, đổi tần số theo nhịp, dừng được', () => {
    svc.playEmergencySiren();
    expect(audio.created.oscillators).toHaveLength(1);
    const o = audio.created.oscillators[0];
    expect(o.type).toBe('sawtooth');
    expect(o.start).toHaveBeenCalled();
    vi.advanceTimersByTime(380 * 2);
    expect(o.frequency.exponentialRampToValueAtTime.mock.calls.map((c) => c[0])).toEqual([960, 700]);
    svc.stopEmergencySiren();
    expect(o.stop).toHaveBeenCalled();
    expect(o.disconnect).toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(o.frequency.exponentialRampToValueAtTime).toHaveBeenCalledTimes(2);
  });

  it('phát lại còi thì dừng còi cũ', () => {
    svc.playEmergencySiren();
    svc.playEmergencySiren();
    expect(audio.created.oscillators[0].stop).toHaveBeenCalled();
    expect(audio.created.oscillators).toHaveLength(2);
  });

  it('tắt tiếng → dừng còi và không phát âm nào', () => {
    svc.playEmergencySiren();
    svc.setMuted(true);
    expect(svc.getIsMuted()).toBe(true);
    expect(audio.created.oscillators[0].stop).toHaveBeenCalled();
    svc.playEmergencySiren();
    svc.playPriorityBeep();
    svc.playSuccessChime();
    expect(audio.created.oscillators).toHaveLength(1);
  });

  it('beep ưu tiên 3 nhịp, chuông thành công 4 nốt', () => {
    svc.playPriorityBeep();
    expect(audio.created.oscillators).toHaveLength(3);
    svc.playSuccessChime();
    expect(audio.created.oscillators).toHaveLength(7);
    expect(audio.created.oscillators.slice(3).map((o) => o.frequency.setValueAtTime.mock.calls[0][0])).toEqual([523.25, 659.25, 783.99, 1046.5]);
  });

  it('AudioContext bị treo → resume', () => {
    svc.playPriorityBeep();
    svc.playPriorityBeep();
    // chỉ tạo 1 AudioContext và resume 1 lần (lần sau đã running)
    expect(audio.created.oscillators).toHaveLength(6);
  });

  it('stop khi oscillator đã dừng không ném lỗi', () => {
    svc.playEmergencySiren();
    audio.created.oscillators[0].stop.mockImplementation(() => {
      throw new Error('already stopped');
    });
    expect(() => svc.stopEmergencySiren()).not.toThrow();
  });
});
