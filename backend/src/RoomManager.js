import { Room, generateRoomCode, Member } from "./Room.js";

/**
 * RoomManager тримає всі активні кімнати в пам'яті процесу (Map).
 *
 * Це достатньо для одного інстансу backend (Railway, один dyno).
 * Якщо знадобиться горизонтальне масштабування - тут можна підмінити
 * Map на Redis без зміни решти коду (інтерфейс лишається той самий).
 */
export class RoomManager {
  constructor({ ttlMs = 6 * 60 * 60 * 1000 } = {}) {
    this.rooms = new Map(); // code -> Room
    this.ttlMs = ttlMs;

    // Періодично прибираємо неактивні кімнати
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 10 * 60 * 1000);
  }

  /**
   * Створює нову кімнату з унікальним кодом.
   */
  createRoom(hostMemberData) {
    let code;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const host = new Member({ ...hostMemberData, isHost: true });
    const room = new Room(code, host);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(code.toUpperCase()) || null;
  }

  deleteRoom(code) {
    this.rooms.delete(code.toUpperCase());
  }

  /**
   * Додає учасника до існуючої кімнати.
   * Якщо в кімнаті ще немає хоста (всі вийшли) - новий учасник стає хостом.
   */
  joinRoom(code, memberData) {
    const room = this.getRoom(code);
    if (!room) return null;

    const isHost = !room.hasHost();
    const member = new Member({ ...memberData, isHost });
    room.addMember(member);
    return room;
  }

  /**
   * Видаляє учасника за socketId з усіх кімнат (на disconnect).
   * Повертає кімнату, з якої вийшов учасник (або null).
   */
  leaveBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.members.has(socketId)) {
        const wasHost = room.getMember(socketId)?.isHost;
        room.removeMember(socketId);

        if (room.members.size === 0) {
          this.deleteRoom(room.code);
          return { room: null, code: room.code, becameEmpty: true };
        }

        let newHost = null;
        if (wasHost && !room.hasHost()) {
          newHost = room.promoteNextHost();
        }

        return { room, code: room.code, becameEmpty: false, newHost };
      }
    }
    return null;
  }

  /**
   * Прибирає кімнати, в яких давно немає активності (TTL).
   */
  cleanupStaleRooms() {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > this.ttlMs) {
        this.rooms.delete(code);
      }
    }
  }

  stats() {
    return {
      totalRooms: this.rooms.size,
      totalMembers: Array.from(this.rooms.values()).reduce(
        (sum, r) => sum + r.members.size,
        0
      ),
    };
  }
}
