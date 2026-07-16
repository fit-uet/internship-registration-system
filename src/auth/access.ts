export type UserRole = 'student' | 'lecturer' | 'admin';

export type AuthenticatedUser = {
  id?: number;
  role?: UserRole;
  is_lecturer?: boolean | number;
  [key: string]: unknown;
};

export const isAdmin = (user: AuthenticatedUser | null | undefined) => user?.role === 'admin';

export const isStudent = (user: AuthenticatedUser | null | undefined) => user?.role === 'student';

export const isLecturer = (user: AuthenticatedUser | null | undefined) =>
  user?.role === 'lecturer' || Boolean(user?.is_lecturer);

export const canReviewRegistrations = (user: AuthenticatedUser | null | undefined) =>
  isAdmin(user) || isLecturer(user);
