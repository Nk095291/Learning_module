import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { User, UserRoleName } from '../entities/user.entity.js';

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: sequence,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'free' as UserRoleName,
}));