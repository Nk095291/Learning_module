import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { Blog } from '../entities/blog.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { userFactory } from '../../users/factories/user.factory.js';

export const blogFactory = Factory.define<Blog>(({ sequence, params }) => {
  const author = (params.author as User | undefined) ?? userFactory.build();

  return {
    id: sequence,
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
    authorId: params.authorId ?? author.id,
    author,
  };
});