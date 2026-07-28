export type Role = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
}

export interface Company {
  id: string;
  name: string;
  floors: number;
  inviteCode?: string; // present for admins
}

export interface CompanyDetails {
  id: string;
  name: string;
  floors: number;
  inviteCode?: string;
  roomCount: number;
  memberCount: number;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
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

export interface AvailabilityRoom extends Room {
  available: boolean;
  conflict: CurrentBooking | null;
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
  company: Company;
}
