export const USER_ROLES = ['admin', 'premium', 'free'] as const;
export type UserRoleName = (typeof USER_ROLES)[number];
export const DEFAULT_ROLE: UserRoleName = 'free';

export class User {
    id : number;
    name : string;
    email : string;
    role : UserRoleName;
}
