import { createUserRole } from './create-user-role.js';
import { Admin } from './admin.role.js';
import { PremiumUser } from './premium-user.role.js';
import { FreeUser } from './free-user.role.js';
import { userFactory } from '../factories/user.factory.js';
import { blogFactory } from '../../blogs/factories/blog.factory.js';

describe('createUserRole', () => {
  it('should return Admin for role admin', () => {
    expect(createUserRole(userFactory.build({ role: 'admin' }))).toBeInstanceOf(
      Admin,
    );
  });

  it('should return PremiumUser for role premium', () => {
    expect(
      createUserRole(userFactory.build({ role: 'premium' })),
    ).toBeInstanceOf(PremiumUser);
  });

  it('should return FreeUser for role free', () => {
    expect(createUserRole(userFactory.build({ role: 'free' }))).toBeInstanceOf(
      FreeUser,
    );
  });
});

describe('role delete permissions', () => {
  const ownBlog = blogFactory.build({ authorId: 1 });
  const otherBlog = blogFactory.build({ authorId: 99 });

  it('should let an admin delete any blog', () => {
    const role = createUserRole(userFactory.build({ id: 3, role: 'admin' }));

    expect(role.canDeletePost(ownBlog)).toBe(true);
    expect(role.canDeletePost(otherBlog)).toBe(true);
  });

  it('should let free and premium users delete only their own blog', () => {
    const free = createUserRole(userFactory.build({ id: 1, role: 'free' }));
    const premium = createUserRole(
      userFactory.build({ id: 1, role: 'premium' }),
    );

    expect(free.canDeletePost(ownBlog)).toBe(true);
    expect(free.canDeletePost(otherBlog)).toBe(false);
    expect(premium.canDeletePost(ownBlog)).toBe(true);
    expect(premium.canDeletePost(otherBlog)).toBe(false);
  });
});