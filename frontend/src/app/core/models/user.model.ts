export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'manager';
  avatarUrl?: string;
  createdAt?: string;
}
