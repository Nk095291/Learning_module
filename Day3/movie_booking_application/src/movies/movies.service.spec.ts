import { Database } from '../database/database.service.js';
import { MoviesService } from './movies.service.js';

describe('MoviesService', () => {
  let db: Database;
  let service: MoviesService;

  beforeEach(() => {
    db = new Database();
    service = new MoviesService(db);
  });

  describe('create', () => {
    it('should assign the new movie a fresh id', () => {
      // given when
      const movie = service.create({ title: 'Interstellar', ageRating: 13 });

      // then
      expect(movie.id).toBe(2);
    });

    it('should ignore a client-supplied id', () => {
      // given
      const dto = { title: 'Interstellar', ageRating: 13, id: 1 } as any;

      // when
      const movie = service.create(dto);

      // then
      expect(movie.id).toBe(2);
      expect(db.movies[1].title).toBe('Inception');
    });

    it('should ignore a client-supplied created_at', () => {
      // given
      const suppliedCreatedAt = new Date('2000-01-01');
      const dto = { title: 'Interstellar', ageRating: 13, created_at: suppliedCreatedAt } as any;

      // when
      const movie = service.create(dto);

      // then
      expect(movie.created_at).not.toEqual(suppliedCreatedAt);
    });
  });
});
