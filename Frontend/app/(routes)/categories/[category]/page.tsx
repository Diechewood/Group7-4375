'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, ArrowUpDown } from 'lucide-react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'

interface Material {
  mat_id: number
  brand_id: number
  mat_name: string
  mat_sku: string
  mat_inv: number
  mat_alert: number
  img_id: string | null
}

interface Brand {
  brand_id: number
  mc_id: number
  brand_name: string
  brand_price: number | string
  img_id: string | null
}

export default function CategoryPage() {
  const params = useParams()
  const [materials, setMaterials] = useState<Material[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [materialsRes, brandsRes] = await Promise.all([
          fetch('http://localhost:5000/api/materials'),
          fetch('http://localhost:5000/api/materialbrands')
        ])
        
        if (!materialsRes.ok || !brandsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const [materialsData, brandsData] = await Promise.all([
          materialsRes.json(),
          brandsRes.json()
        ])

        setMaterials(materialsData)
        setBrands(brandsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load materials. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredMaterials = materials.filter(material => {
    const brand = brands.find(b => b.brand_id === material.brand_id)
    return (
      brand?.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.mat_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.mat_sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    const nameA = brands.find(brand => brand.brand_id === a.brand_id)?.brand_name || a.mat_name
    const nameB = brands.find(brand => brand.brand_id === b.brand_id)?.brand_name || b.mat_name
    return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
  })

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F0E9] text-[#3D3B54]">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 md:ml-64 mt-16">
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center">
              <Button variant="ghost" className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">{params.category}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search materials..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                variant="outline"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                A to Z
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          {error ? (
            <div className="text-red-500 mb-4">{error}</div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading materials...</div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Color</th>
                    <th className="p-2 text-left">Brand/Name</th>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Inv (oz)</th>
                    <th className="p-2 text-left">Alert(oz)</th>
                    <th className="p-2 text-left">$</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMaterials.map((material) => {
                    const brand = brands.find(b => b.brand_id === material.brand_id)
                    return (
                      <tr key={material.mat_id} className="border-b last:border-b-0">
                        <td className="p-2">{material.mat_name}</td>
                        <td className="p-2">{brand?.brand_name || ''}</td>
                        <td className="p-2">{material.mat_sku}</td>
                        <td className="p-2">{material.mat_inv}</td>
                        <td className="p-2">{material.mat_alert}</td>
                        <td className="p-2">
                          {brand && typeof brand.brand_price === 'number'
                            ? `$${brand.brand_price.toFixed(2)}`
                            : brand?.brand_price || ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}