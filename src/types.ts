export interface CourseStats {
  total: number;
  grade1: number;
  grade2: number;
  grade3: number;
}

export interface JuniorHighSchool {
  id: string;
  name: string;
  city: string;
  prefecture: string;
  lat: number;
  lng: number;
  distanceKm: number;
  bearing: string;
  totalCount: number;
  grade1Count: number;
  grade2Count: number;
  grade3Count: number;
  courses: Record<string, CourseStats>;
  classes: Record<string, number>;
  primaryCourse: string;
  rank: number;
  // True when the school wasn't found in the geocoding database and its
  // coordinates are a placeholder near the high school (uploaded data only).
  geoEstimated?: boolean;
}

// Individual student IDs are intentionally not part of this shape: the
// bundled dataset is served publicly, so it only carries non-identifying
// attributes needed for aggregation.
export interface Student {
  year: number;
  schoolType: string;
  grade: number;
  department: string;
  course: string;
  class: string;
  attendanceNumber?: number;
  schoolName: string;
  gender?: string;
}

export interface HighSchoolInfo {
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  address: string;
  tel: string;
  established?: number;
  description: string;
}

export type GradeFilter = 'all' | 1 | 2 | 3;
export type CourseFilter =
  | 'all'
  | '進学'
  | '特進'
  | 'グローバル'
  | '理数フロンティア'
  | 'スポーツ'
  | '一貫';
export type DistanceRange = 'all' | 'under5' | '5to10' | '10to20' | 'over20';

export interface FilterState {
  searchQuery: string;
  grade: GradeFilter;
  course: CourseFilter;
  prefecture: string;
  city: string;
  distanceRange: DistanceRange;
}
