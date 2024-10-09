import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-purple-100 text-gray-800">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 md:ml-64 mt-16">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          {/*  dashboard content here */}
        </main>
      </div>
    </div>
  )
}