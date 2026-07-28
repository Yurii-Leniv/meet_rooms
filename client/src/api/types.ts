export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  location: string | null;
  amenities: string[];
  imageUrl: string | null;
  isActive: boolean;
}

export interface BookingUser {
  id: string;
  name: string;
}

export interface CurrentBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  user: BookingUser;
}

export interface RoomWithStatus extends Room {
  busy: boolean;
  currentBooking: CurrentBooking | null;
}

export interface Booking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  roomId: string;
  userId: string;
  user?: BookingUser;
  room?: { id: string; name: string; floor: number };
}

export interface AuthResponse {
  token: string;
  user: User;
}
