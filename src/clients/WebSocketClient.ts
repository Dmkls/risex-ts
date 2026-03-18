import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Logger } from '../core/Logger.js';
import { RateLimiter } from '../core/RateLimiter.js';
import {
  DEFAULT_WS_URL,
  WS_HEARTBEAT_INTERVAL_MS,
  WS_RECONNECT_DELAY_MS,
  WS_MAX_RECONNECT_DELAY_MS,
  WS_RATE_LIMIT,
  WS_RATE_WINDOW_MS,
} from '../utils/constants.js';
import type { ClientOptions } from '../types/config.js';
import type { WsSubscription, WsMessage, WsEventHandler } from '../types/websocket.js';

// Inline CRC32 for orderbook checksum validation
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC32_TABLE[i] = c;
}

function crc32(str: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc = CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Use globalThis.WebSocket in browser, ws in Node.js
type WSImpl = WebSocket | globalThis.WebSocket;

export class WebSocketClient extends EventEmitter {
  private readonly url: string;
  private readonly log: Logger;
  private readonly rateLimiter: RateLimiter;
  private ws: WSImpl | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = WS_RECONNECT_DELAY_MS;
  private subscriptions: WsSubscription[] = [];
  private autoReconnect = true;
  private connected = false;
  private handlers = new Map<string, Set<WsEventHandler>>();

  constructor(opts?: ClientOptions) {
    super();
    this.url = opts?.wsUrl ?? DEFAULT_WS_URL;
    this.log = new Logger('WebSocket', opts?.logLevel ?? 'warn');
    this.rateLimiter = new RateLimiter(WS_RATE_LIMIT, WS_RATE_WINDOW_MS);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log.info('Connecting to', this.url);
      let settled = false;

      try {
        this.ws = new WebSocket(this.url) as WSImpl;
      } catch {
        this.ws = new globalThis.WebSocket(this.url);
      }

      const onOpen = () => {
        settled = true;
        this.connected = true;
        this.reconnectDelay = WS_RECONNECT_DELAY_MS;
        this.startHeartbeat();
        this.resubscribe();
        this.log.info('Connected');
        this.emit('open');
        resolve();
      };

      const onError = (err: Event | Error) => {
        this.log.error('WebSocket error', err);
        if (this.listenerCount('error') > 0) this.emit('error', err);
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      const onClose = () => {
        this.connected = false;
        this.stopHeartbeat();
        this.log.info('Disconnected');
        this.emit('close');
        if (!settled) {
          settled = true;
          reject(new Error('WebSocket closed before open'));
        }
        if (this.autoReconnect && settled) this.scheduleReconnect();
      };

      if (this.ws instanceof WebSocket) {
        this.ws.on('open', onOpen);
        this.ws.on('error', onError);
        this.ws.on('close', onClose);
        this.ws.on('message', (data: WebSocket.Data) => this.handleMessage(String(data)));
      } else {
        this.ws.onopen = onOpen;
        this.ws.onerror = onError as (ev: Event) => void;
        this.ws.onclose = onClose;
        this.ws.onmessage = (event: MessageEvent) => this.handleMessage(String(event.data));
      }
    });
  }

  disconnect(): void {
    this.autoReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  subscribe(sub: WsSubscription): void {
    this.subscriptions.push(sub);
    if (this.connected) this.sendSubscription('subscribe', sub);
  }

  unsubscribe(sub: WsSubscription): void {
    this.subscriptions = this.subscriptions.filter(
      (s) => !(s.channel === sub.channel && JSON.stringify(s.market_ids) === JSON.stringify(sub.market_ids) && s.account === sub.account),
    );
    if (this.connected) this.sendSubscription('unsubscribe', sub);
  }

  override on(event: 'message', handler: WsEventHandler): this;
  override on(event: 'open' | 'close', handler: () => void): this;
  override on(event: 'error', handler: (err: unknown) => void): this;
  override on(event: string | symbol, handler: (...args: any[]) => void): this {
    return super.on(event, handler);
  }

  onChannel(channel: string, handler: WsEventHandler): void {
    if (!this.handlers.has(channel)) this.handlers.set(channel, new Set());
    this.handlers.get(channel)!.add(handler);
  }

  offChannel(channel: string, handler: WsEventHandler): void {
    this.handlers.get(channel)?.delete(handler);
  }

  get isConnected(): boolean {
    return this.connected;
  }

  /** Compute CRC32 checksum for orderbook validation. */
  static orderbookChecksum(bids: Array<[string, string]>, asks: Array<[string, string]>): number {
    const parts: string[] = [];
    const len = Math.max(bids.length, asks.length);
    for (let i = 0; i < len; i++) {
      if (i < bids.length) parts.push(`${bids[i][0]}:${bids[i][1]}`);
      if (i < asks.length) parts.push(`${asks[i][0]}:${asks[i][1]}`);
    }
    return crc32(parts.join(':'));
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as WsMessage;

      // Emit to general listeners
      this.emit('message', msg);

      // Emit to channel-specific listeners
      const channel = msg.channel;
      if (channel && this.handlers.has(channel)) {
        for (const handler of this.handlers.get(channel)!) {
          handler(msg);
        }
      }
    } catch (err) {
      this.log.error('Failed to parse WS message:', raw, err);
    }
  }

  private sendSubscription(action: 'subscribe' | 'unsubscribe', sub: WsSubscription): void {
    try {
      this.rateLimiter.acquire();
    } catch {
      this.log.warn('WS rate limited, delaying subscription');
      setTimeout(() => this.sendSubscription(action, sub), 100);
      return;
    }

    const params: Record<string, unknown> = {
      channel: sub.channel,
    };
    if (sub.market_ids !== undefined) params.market_ids = sub.market_ids;
    if (sub.account) params.account = sub.account;

    const payload = {
      method: action,
      params,
    };

    this.send(JSON.stringify(payload));
  }

  private send(data: string): void {
    if (!this.ws || !this.connected) return;
    if (this.ws instanceof WebSocket) {
      this.ws.send(data);
    } else {
      this.ws.send(data);
    }
  }

  private resubscribe(): void {
    for (const sub of this.subscriptions) {
      this.sendSubscription('subscribe', sub);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send(JSON.stringify({ op: 'ping' }));
    }, WS_HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.log.info(`Reconnecting in ${this.reconnectDelay}ms`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, WS_MAX_RECONNECT_DELAY_MS);
        this.scheduleReconnect();
      }
    }, this.reconnectDelay);
  }
}
