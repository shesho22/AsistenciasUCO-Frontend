import { User, UserRole } from '../../models/user.model';

/** Sustituto de `user.mock.ts` en producción (fileReplacements): sin usuarios simulados en el bundle. */
export const MOCK_USERS_BY_ROLE = {} as Record<UserRole, User>;
export const MOCK_USERS_LIST: User[] = [];
