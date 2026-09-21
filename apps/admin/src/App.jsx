import { Routes, Route } from 'react-router'
import RequireAuth from './components/RequireAuth'
import Shell from './components/Shell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import PostEditor from './pages/PostEditor'
import Syllabi from './pages/Syllabi'
import Subscribers from './pages/Subscribers'
import Forms from './pages/Forms'
import Submissions from './pages/Submissions'
import Members from './pages/Members'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything else is behind a session. The permission each page needs
          is declared by the page itself, not here — see <Gate>. */}
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/new" element={<PostEditor />} />
          <Route path="posts/:id" element={<PostEditor />} />
          <Route path="syllabi" element={<Syllabi />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="forms" element={<Forms />} />
          <Route path="forms/:id/submissions" element={<Submissions />} />
          <Route path="members" element={<Members />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
