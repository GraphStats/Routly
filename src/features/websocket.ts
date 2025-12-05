import * as http from 'http';
import { Request } from '../core/request';
import { Response } from '../core/response';
import { Routly } from '../core/application';

export interface WebSocketHandler {
    (ws: WebSocketConnection, req: Request): void | Promise<void>;
}

export interface WebSocketConnection {
    send(data: string | Buffer): void;
    close(code?: number, reason?: string): void;
    on(event: 'message', listener: (data: Buffer) => void): void;
    on(event: 'close', listener: (code: number, reason: string) => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
    ping(): void;
    readyState: number;
}

export interface WebSocketOptions {
    path?: string;
    verifyClient?: (req: Request) => boolean | Promise<boolean>;
    onConnection?: (ws: WebSocketConnection, req: Request) => void;
    onError?: (error: Error) => void;
}

/**
 * WebSocket support for Routly
 * Provides easy WebSocket integration with route-based handlers
 */
export class WebSocketServer {
    private handlers: Map<string, WebSocketHandler> = new Map();
    private connections: Set<WebSocketConnection> = new Set();
    private rooms: Map<string, Set<WebSocketConnection>> = new Map();

    /**
     * Add a WebSocket route handler
     */
    route(path: string, handler: WebSocketHandler): this {
        this.handlers.set(path, handler);
        return this;
    }

    /**
     * Handle WebSocket upgrade
     */
    handleUpgrade(req: http.IncomingMessage, socket: any, head: Buffer) {
        const url = req.url || '/';
        const handler = this.handlers.get(url);

        if (!handler) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }

        // Simple WebSocket handshake
        const key = req.headers['sec-websocket-key'];
        if (!key) {
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            socket.destroy();
            return;
        }

        const crypto = require('crypto');
        const acceptKey = crypto
            .createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');

        const responseHeaders = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptKey}`,
            '',
            ''
        ].join('\r\n');

        socket.write(responseHeaders);

        // Create WebSocket connection wrapper
        const ws = this.createConnection(socket);
        this.connections.add(ws);

        // Call handler
        handler(ws, req as Request);

        // Cleanup on close
        socket.on('close', () => {
            this.connections.delete(ws);
            // Remove from all rooms
            for (const [roomName, room] of this.rooms.entries()) {
                room.delete(ws);
                if (room.size === 0) {
                    this.rooms.delete(roomName);
                }
            }
        });
    }

    /**
     * Create WebSocket connection wrapper
     */
    private createConnection(socket: any): WebSocketConnection {
        const connection: any = {
            readyState: 1, // OPEN

            send(data: string | Buffer) {
                if (connection.readyState !== 1) return;

                const buffer = typeof data === 'string' ? Buffer.from(data) : data;
                const frame = this.createFrame(buffer);
                socket.write(frame);
            },

            close(code: number = 1000, reason: string = '') {
                if (connection.readyState !== 1) return;

                connection.readyState = 2; // CLOSING
                const closeFrame = Buffer.alloc(2);
                closeFrame.writeUInt16BE(code, 0);
                socket.write(this.createFrame(closeFrame, 0x8));
                socket.end();
                connection.readyState = 3; // CLOSED
            },

            on(event: string, listener: Function) {
                if (event === 'message') {
                    socket.on('data', (data: Buffer) => {
                        const messages = this.parseFrames(data);
                        messages.forEach((msg: Buffer) => listener(msg));
                    });
                } else {
                    socket.on(event, listener);
                }
            },

            ping() {
                if (connection.readyState !== 1) return;
                socket.write(this.createFrame(Buffer.alloc(0), 0x9));
            },

            createFrame(payload: Buffer, opcode: number = 0x1) {
                const payloadLength = payload.length;
                let frame: Buffer;

                if (payloadLength < 126) {
                    frame = Buffer.alloc(2 + payloadLength);
                    frame[0] = 0x80 | opcode; // FIN + opcode
                    frame[1] = payloadLength;
                    payload.copy(frame, 2);
                } else if (payloadLength < 65536) {
                    frame = Buffer.alloc(4 + payloadLength);
                    frame[0] = 0x80 | opcode;
                    frame[1] = 126;
                    frame.writeUInt16BE(payloadLength, 2);
                    payload.copy(frame, 4);
                } else {
                    frame = Buffer.alloc(10 + payloadLength);
                    frame[0] = 0x80 | opcode;
                    frame[1] = 127;
                    frame.writeBigUInt64BE(BigInt(payloadLength), 2);
                    payload.copy(frame, 10);
                }

                return frame;
            },

            parseFrames(data: Buffer): Buffer[] {
                const messages: Buffer[] = [];
                let offset = 0;

                while (offset < data.length) {
                    const fin = (data[offset] & 0x80) !== 0;
                    const opcode = data[offset] & 0x0f;
                    offset++;

                    if (offset >= data.length) break;

                    const masked = (data[offset] & 0x80) !== 0;
                    let payloadLength = data[offset] & 0x7f;
                    offset++;

                    if (payloadLength === 126) {
                        if (offset + 2 > data.length) break;
                        payloadLength = data.readUInt16BE(offset);
                        offset += 2;
                    } else if (payloadLength === 127) {
                        if (offset + 8 > data.length) break;
                        payloadLength = Number(data.readBigUInt64BE(offset));
                        offset += 8;
                    }

                    let maskKey: Buffer | undefined;
                    if (masked) {
                        if (offset + 4 > data.length) break;
                        maskKey = data.slice(offset, offset + 4);
                        offset += 4;
                    }

                    if (offset + payloadLength > data.length) break;

                    let payload = data.slice(offset, offset + payloadLength);
                    offset += payloadLength;

                    if (maskKey) {
                        payload = Buffer.from(payload.map((byte, i) => byte ^ maskKey![i % 4]));
                    }

                    if (opcode === 0x1 || opcode === 0x2) {
                        messages.push(payload);
                    } else if (opcode === 0x8) {
                        connection.close();
                    } else if (opcode === 0x9) {
                        // Ping - send pong
                        socket.write(this.createFrame(payload, 0xA));
                    }
                }

                return messages;
            }
        };

        return connection;
    }

    /**
     * Broadcast to all connections
     */
    broadcast(data: string | Buffer, exclude?: WebSocketConnection) {
        for (const ws of this.connections) {
            if (ws !== exclude) {
                ws.send(data);
            }
        }
    }

    /**
     * Create or get a room
     */
    room(name: string): Set<WebSocketConnection> {
        if (!this.rooms.has(name)) {
            this.rooms.set(name, new Set());
        }
        return this.rooms.get(name)!;
    }

    /**
     * Join a room
     */
    join(ws: WebSocketConnection, roomName: string) {
        this.room(roomName).add(ws);
    }

    /**
     * Leave a room
     */
    leave(ws: WebSocketConnection, roomName: string) {
        const room = this.rooms.get(roomName);
        if (room) {
            room.delete(ws);
            if (room.size === 0) {
                this.rooms.delete(roomName);
            }
        }
    }

    /**
     * Broadcast to a room
     */
    broadcastToRoom(roomName: string, data: string | Buffer, exclude?: WebSocketConnection) {
        const room = this.rooms.get(roomName);
        if (room) {
            for (const ws of room) {
                if (ws !== exclude) {
                    ws.send(data);
                }
            }
        }
    }

    /**
     * Get all connections
     */
    getConnections(): Set<WebSocketConnection> {
        return this.connections;
    }

    /**
     * Get connection count
     */
    getConnectionCount(): number {
        return this.connections.size;
    }
}

/**
 * Add WebSocket support to Routly app
 */
export function addWebSocketSupport(app: Routly): WebSocketServer {
    const wss = new WebSocketServer();

    // Handle upgrade event
    if (app.server) {
        app.server.on('upgrade', (req, socket, head) => {
            wss.handleUpgrade(req, socket, head);
        });
    }

    return wss;
}

/**
 * Create a standalone WebSocket server
 */
export function createWebSocketServer(options: WebSocketOptions = {}): WebSocketServer {
    return new WebSocketServer();
}
