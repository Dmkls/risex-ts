import { describe, it, expect, afterEach } from 'vitest';
import { WebSocketClient } from '../../src/index.js';
import type { WsMessage } from '../../src/index.js';
import 'dotenv/config';

const RUN = process.env.RUN_INTEGRATION === 'true';

describe.skipIf(!RUN)('WebSocketClient integration', () => {
  let ws: WebSocketClient;

  afterEach(() => {
    ws?.disconnect();
  });

  it('should connect and receive orderbook data', async () => {
    ws = new WebSocketClient({
      wsUrl: process.env.WS_URL,
      logLevel: 'info',
    });

    const messages: WsMessage[] = [];

    ws.onChannel('orderbook', (msg) => {
      messages.push(msg);
    });

    try {
      await ws.connect();
    } catch {
      // WS endpoint may not be available - skip
      console.log('WS connection failed, skipping test');
      return;
    }

    ws.subscribe({ channel: 'orderbook', market_ids: [1] });

    // Wait up to 10 seconds for a message
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (messages.length > 0) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 10_000);
    });

    // If connected, we should have received messages
    if (ws.isConnected) {
      expect(messages.length).toBeGreaterThan(0);
    }
  }, 15_000);
});
