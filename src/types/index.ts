export type Role = 'ADMIN' | 'STUDENT'
export type LessonType = 'VIDEO' | 'TEXT' | 'FORM' | 'EXAM'

export interface LessonResource {
    id: string
    name: string
    url: string
    type: 'link' | 'file'
}

export interface FormField {
    id: string
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'email' | 'number'
    label: string
    placeholder?: string
    required: boolean
    options?: string[]
}

export interface ExamQuestion {
    id: string
    text: string
    options: string[]
    correctOptions: number[]
    points?: number
    explanation?: string
}

export interface SanitizedExamQuestion {
    id: string
    text: string
    options: string[]
}

export interface UserBase {
    id: string
    name: string
    last_name: string
    username: string
    email: string
    phone: string | null
    role: Role
    created_at: Date
}

export interface CourseBase {
    id: string
    title: string
    description: string
    thumbnail: string | null
    hero_image: string | null
    price: number | null
    published: boolean
    created_at: Date
    updated_at: Date
}

export interface CourseWithCount extends CourseBase {
    _count: {
        modules: number
        enrollments: number
    }
}

export interface LessonBase {
    id: string
    module_id: string
    title: string
    description: string | null
    type: LessonType
    video_url: string | null
    thumbnail: string | null
    bunny_video_id: string | null
    bunny_status: string | null
    content: string | null
    form_schema: FormField[] | null
    exam_schema: ExamQuestion[] | null
    passing_score: number | null
    max_attempts: number | null
    is_final_exam: boolean
    order: number
    duration: number | null
    created_at: Date
    updated_at: Date
}

export interface LessonWithProgress extends LessonBase {
    progress: Array<{
        completed: boolean
        completed_at: Date | null
    }>
}

export interface ModuleWithLessons {
    id: string
    course_id: string
    title: string
    order: number
    lessons: LessonWithProgress[]
}

export interface CourseWithModules extends CourseBase {
    modules: ModuleWithLessons[]
}

export interface EnrollmentWithProgress {
    id: string
    course: CourseBase & { modules: ModuleWithLessons[] }
    percentComplete: number
    totalLessons: number
    completedLessons: number
}

export interface StudentWithEnrollments extends UserBase {
    _count: {
        enrollments: number
    }
}

export interface CourseEnrollmentProgress {
    enrollmentId: string
    courseId: string
    courseTitle: string
    instructorName: string | null
    enrolledAt: string
    totalLessons: number
    completedLessons: number
    progressPercent: number
    approved: boolean
    approvedAt: string | null
    hasFinalExam: boolean
    finalExamPassed: boolean | null
    finalExamScore: number | null
}
