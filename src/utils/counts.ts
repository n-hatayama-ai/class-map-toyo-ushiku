import { JuniorHighSchool, GradeFilter } from '../types';

// Student count for a school under the active grade filter.
export function countForGrade(s: JuniorHighSchool, grade: GradeFilter): number {
  if (grade === 1) return s.grade1Count;
  if (grade === 2) return s.grade2Count;
  if (grade === 3) return s.grade3Count;
  return s.totalCount;
}

// The internal junior high school (中高一貫) that feeds the high school.
export const INTERNAL_JHS_NAME = '東洋大学附属牛久中学校';
