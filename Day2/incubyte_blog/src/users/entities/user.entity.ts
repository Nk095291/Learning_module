export const USER_ROLES = ['admin', 'premium', 'free'] as const;
export type UserRoleName = (typeof USER_ROLES)[number];

export class User {
    id : number; 
    name : string;
    email : string;
    role : UserRoleName;
}
