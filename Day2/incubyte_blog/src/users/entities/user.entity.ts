export type UserRoleName = 'admin' | 'premium' | 'free';

export class User {
    id : number; 
    name : string;
    email : string;
    role : UserRoleName;
}
