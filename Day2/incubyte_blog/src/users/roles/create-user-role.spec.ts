import { getUserRole } from './get-user-role.js';
import { Admin } from './admin.role.js';
import { PremiumUser } from './premium-user.role.js';
import { FreeUser } from './free-user.role.js';
import { userFactory } from '../factories/user.factory.js';
import { blogFactory } from '../../blogs/factories/blog.factory.js';

describe('createUserRole', () => {
  it('should return Admin for role admin', () => {
    expect(getUserRole(userFactory.build({ role: 'admin' }))).toBeInstanceOf(
      Admin,
    );
  });

  it('should return PremiumUser for role premium', () => {
    expect(
      getUserRole(userFactory.build({ role: 'premium' })),
    ).toBeInstanceOf(PremiumUser);
  });

  it('should return FreeUser for role free', () => {
    expect(getUserRole(userFactory.build({ role: 'free' }))).toBeInstanceOf(
      FreeUser,
    );
  });
});

describe('role delete permissions', () => {
  const ownBlog = blogFactory.build({ authorId: 1 });
  const otherBlog = blogFactory.build({ authorId: 99 });

  it('should let an admin delete any blog', () => {
    const role = getUserRole(userFactory.build({ id: 3, role: 'admin' }));

    expect(role.canDeleteBlog(ownBlog)).toBe(true);
    expect(role.canDeleteBlog(otherBlog)).toBe(true);
  });

  it('should let free and premium users delete only their own blog', () => {
    const free = getUserRole(userFactory.build({ id: 1, role: 'free' }));
    const premium = getUserRole(
      userFactory.build({ id: 1, role: 'premium' }),
    );

    expect(free.canDeleteBlog(ownBlog)).toBe(true);
    expect(free.canDeleteBlog(otherBlog)).toBe(false);
    expect(premium.canDeleteBlog(ownBlog)).toBe(true);
    expect(premium.canDeleteBlog(otherBlog)).toBe(false);
  });
});