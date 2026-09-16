import { User } from '../../users/entities/user.entity.js';

export class Blog {
    id: number;
    title: string;
    content: string;
    authorId: number;
    author?: User;
}
