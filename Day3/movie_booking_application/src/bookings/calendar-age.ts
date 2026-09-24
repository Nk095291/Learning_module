export function ageOn(dateOfBirth: Date, today: Date): number {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const birthdayReachedThisYear =
    today.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (today.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      today.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!birthdayReachedThisYear) {
    age -= 1;
  }
  return age;
}
