import { ageOn } from './calendar-age.js';

describe('ageOn', () => {
  it('should return the full year difference on the exact birthday', () => {
    // given
    const dateOfBirth = new Date('1980-03-01');
    const today = new Date('1993-03-01');

    // when
    const age = ageOn(dateOfBirth, today);

    // then
    expect(age).toBe(13);
  });

  it('should return one less than the year difference the day before the birthday', () => {
    // given
    const dateOfBirth = new Date('1980-03-01');
    const today = new Date('1993-02-28');

    // when
    const age = ageOn(dateOfBirth, today);

    // then
    expect(age).toBe(12);
  });

  it('should return the full year difference when todays month is after the birth month', () => {
    // given
    const dateOfBirth = new Date('2010-01-15');
    const today = new Date('2024-06-01');

    // when
    const age = ageOn(dateOfBirth, today);

    // then
    expect(age).toBe(14);
  });

  it('should return one less than the year difference when todays month is before the birth month', () => {
    // given
    const dateOfBirth = new Date('2010-09-15');
    const today = new Date('2024-06-01');

    // when
    const age = ageOn(dateOfBirth, today);

    // then
    expect(age).toBe(13);
  });

  it('should treat a Feb 29 birthday as not yet reached on Feb 28 of a non-leap year', () => {
    // given
    const dateOfBirth = new Date('2000-02-29');
    const today = new Date('2023-02-28');

    // when
    const age = ageOn(dateOfBirth, today);

    // then
    expect(age).toBe(22);
  });

  it('should treat a Feb 29 birthday as reached by Mar 1 of a non-leap year', () => {
    // given
    const dateOfBirth = new Date('2000-02-29');
    const today = new Date('2023-03-01');

    // when
    const age = ageOn(dateOfBirth, today);

    // then
    expect(age).toBe(23);
  });
});
