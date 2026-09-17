import { useEffect, useState, type SubmitEvent } from 'react'

type Attempt = {
  id: string
  puzzleId: string
  puzzleTitle: string
  move: string
  result: 'correct' | 'incorrect'
  checkedAt: string
}

type Student = {
  id: string
  name: string
  practiceKey: string
  createdAt: string
  attempts: Attempt[]
}

export default function CoachDashboard() {
  const [coachToken, setCoachToken] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [studentName, setStudentName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadStudents = async (token: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/practice/students?token=${encodeURIComponent(token)}`)
      const data = await response.json() as { students?: Student[]; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Could not load students.')
      setStudents(data.students ?? [])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load students.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token') ?? ''
    setCoachToken(token)
    if (token) void loadStudents(token)
    else {
      setError('This coach link is missing its access token.')
      setLoading(false)
    }
  }, [])

  const createStudent = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!studentName.trim()) return

    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/practice/students', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ coachToken, name: studentName }),
      })
      const data = await response.json() as { student?: Student; error?: string }
      if (!response.ok || !data.student) throw new Error(data.error ?? 'Could not create student.')
      setStudents((current) => [...current, data.student!])
      setStudentName('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create student.')
    } finally {
      setCreating(false)
    }
  }

  const practiceUrl = (student: Student) =>
    `${window.location.origin}/puzzles?student=${encodeURIComponent(student.id)}&key=${encodeURIComponent(student.practiceKey)}`

  return (
    <div className="grid gap-8">
      <form onSubmit={createStudent} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
        <h2 className="text-2xl font-black text-stone-950">Add a student</h2>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="student-name">Student name</label>
          <input
            id="student-name"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            maxLength={80}
            placeholder="Student name"
            className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-5 py-3 text-base text-stone-950 outline-none focus:border-amber-800"
          />
          <button
            type="submit"
            disabled={creating || !coachToken}
            className="cursor-pointer rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? 'Creating…' : 'Create student link'}
          </button>
        </div>
        {error ? <p className="mt-4 font-bold text-rose-800">{error}</p> : null}
      </form>

      {loading ? <p className="text-stone-600">Loading students…</p> : null}
      {!loading && students.length === 0 && !error ? (
        <p className="rounded-3xl border border-stone-200 bg-white p-6 text-stone-600">No students yet.</p>
      ) : null}

      {students.map((student) => (
        <section key={student.id} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-stone-950">{student.name}</h2>
              <p className="mt-1 text-sm text-stone-500">
                {student.attempts.length} checked {student.attempts.length === 1 ? 'attempt' : 'attempts'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(practiceUrl(student))}
                className="cursor-pointer rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-900 hover:border-stone-950"
              >
                Copy student link
              </button>
              <a
                href={practiceUrl(student)}
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800"
              >
                Open puzzles
              </a>
            </div>
          </div>

          {student.attempts.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-stone-50 p-4 text-stone-600">No attempts recorded yet.</p>
          ) : (
            <ol className="mt-6 grid gap-3">
              {student.attempts.map((attempt) => (
                <li key={attempt.id} className="grid gap-1 rounded-2xl bg-stone-50 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
                  <div>
                    <p className="font-bold text-stone-950">{attempt.puzzleTitle}: {attempt.move}</p>
                    <p className="text-sm text-stone-500">{new Date(attempt.checkedAt).toLocaleString()}</p>
                  </div>
                  <p className={attempt.result === 'correct' ? 'font-bold text-emerald-800' : 'font-bold text-rose-800'}>
                    {attempt.result === 'correct' ? 'Correct' : 'Try again, fool!'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  )
}
