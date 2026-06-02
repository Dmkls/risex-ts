import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock 'ws' before importing the client. The mock matches enough of the ws
// surface that WebSocketClient's `instanceof WebSocket` branch is hit and
// .on/.send work the same way as the real client expects.
class MockWebSocket extends EventEmitter {
  static instances: MockWebSocket[] = [];
  url: string;
  sent: string[] = [];

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
    // Defer 'open' to next tick, matching real ws behavior.
    setImmediate(() => this.emit('open'));
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.emit('close');
  }
}

vi.mock('ws', () => ({ default: MockWebSocket }));

const { WebSocketClient } = await import('../../src/clients/WebSocketClient.js');

describe('WebSocketClient.subscribe payload', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
  });

  function lastSubscribe(mock: MockWebSocket): unknown {
    // Find the most recent subscribe message (skip heartbeats / others).
    for (let i = mock.sent.length - 1; i >= 0; i--) {
      const parsed = JSON.parse(mock.sent[i]) as { method?: string };
      if (parsed.method === 'subscribe' || parsed.method === 'unsubscribe') return parsed;
    }
    throw new Error('no subscribe message sent');
  }

  it('sends subscribe payload for the funding channel', async () => {
    const ws = new WebSocketClient({ wsUrl: 'ws://example.com' });
    await ws.connect();
    const mock = MockWebSocket.instances[0];

    ws.subscribe({ channel: 'funding', market_ids: [1, 2, 3] });

    expect(lastSubscribe(mock)).toEqual({
      method: 'subscribe',
      params: { channel: 'funding', market_ids: [1, 2, 3] },
    });

    ws.disconnect();
  });

  it('omits market_ids when subscribing to all markets', async () => {
    const ws = new WebSocketClient({ wsUrl: 'ws://example.com' });
    await ws.connect();
    const mock = MockWebSocket.instances[0];

    ws.subscribe({ channel: 'orderbook' });

    expect(lastSubscribe(mock)).toEqual({
      method: 'subscribe',
      params: { channel: 'orderbook' },
    });

    ws.disconnect();
  });

  it('forwards makers when provided for private channels', async () => {
    const ws = new WebSocketClient({ wsUrl: 'ws://example.com' });
    await ws.connect();
    const mock = MockWebSocket.instances[0];

    ws.subscribe({
      channel: 'orders',
      market_ids: [1],
      makers: ['0x1234567890abcdef1234567890abcdef12345678'],
    });

    expect(lastSubscribe(mock)).toEqual({
      method: 'subscribe',
      params: {
        channel: 'orders',
        market_ids: [1],
        makers: ['0x1234567890abcdef1234567890abcdef12345678'],
      },
    });

    ws.disconnect();
  });

  it('sends unsubscribe with matching shape', async () => {
    const ws = new WebSocketClient({ wsUrl: 'ws://example.com' });
    await ws.connect();
    const mock = MockWebSocket.instances[0];

    const sub = { channel: 'funding' as const, market_ids: [1] };
    ws.subscribe(sub);
    ws.unsubscribe(sub);

    expect(lastSubscribe(mock)).toEqual({
      method: 'unsubscribe',
      params: { channel: 'funding', market_ids: [1] },
    });

    ws.disconnect();
  });

  // Compile-time regression: the WsChannel union must include 'funding' and
  // must not include 'ticker'. If these assignments stop compiling, the type
  // has regressed. (No runtime assertion needed — type errors fail `npm run
  // lint`.)
  it('exposes funding in WsChannel and not ticker', () => {
    type Assert<T extends true> = T;
    type _OK = Assert<'funding' extends import('../../src/types/websocket.js').WsChannel ? true : false>;
    // @ts-expect-error 'ticker' must not be a valid WsChannel
    const _bad: import('../../src/types/websocket.js').WsChannel = 'ticker';
    expect(true).toBe(true);
  });
});
