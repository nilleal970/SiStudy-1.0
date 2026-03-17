export type StudyStatus = 'not_started' | 'studying' | 'completed' | 'reviewed' | 'mastered';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  studyArea?: string;
  dailyGoalHours?: number;
  weeklyGoalHours?: number;
  preferredBoard?: string;
  theme?: 'light' | 'dark' | 'system';
  createdAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  color: string;
  totalTopics: number;
  completedTopics: number;
  paused?: boolean;
}

export interface Topic {
  id: string;
  subjectId: string;
  userId: string;
  name: string;
  status: StudyStatus;
  lastStudiedAt?: string;
  importance: number; // 1-5
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  topicId?: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  type: 'manual' | 'timer' | 'pomodoro';
}

export interface Revision {
  id: string;
  userId: string;
  topicId: string;
  subjectId: string;
  topicName?: string;
  scheduledDate: string;
  completed: boolean;
  intervalDays: number;
}

export interface SimulatedExam {
  id: string;
  userId: string;
  title: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  date: string;
  performanceBySubject: Record<string, number>;
}
