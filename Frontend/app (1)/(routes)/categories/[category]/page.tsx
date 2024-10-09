'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import MaterialTable from '@/components/MaterialTable'

interface Material {
  mat_id: number
  mat_name: string
  mat_sku: string
  mat_inv: number
  mat_alert: number
}

export default function CategoryPage() {
  const params = useParams()
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/materials?category=${encodeURIComponent(params.category as string)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch materials')
        }
        return response.json()
      })
      .then(data => {
        setMaterials(data)
        setIsLoading(false)
      })
      .catch(error => {
        console.error('Error fetching materials:', error)
        setError('Failed to load materials. Please try again later.')
        setIsLoading(false)
      })
  }, [params.category])

  return (
    <div className="flex flex-col min-h-screen bg-purple-100 text-gray-800">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 md:ml-64 mt-16">
          <h1 className="text-2xl font-bold mb-4">{params.category} Materials</h1>
          {error ? (
            <div className="text-red-500 mb-4">{error}</div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading materials...</div>
          ) : (
            <MaterialTable materials={materials} />
          )}
        </main>
      </div>
    </div>
  )
}