'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, ArrowUpDown, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Material {
  mat_id: number
  brand_id: number
  mat_name: string
  mat_sku: string
  mat_inv: number
  mat_alert: number
  img_id: string | null
  mc_id: number
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
  const router = useRouter()
  const [materials, setMaterials] = useState<Material[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  const decodedCategory = decodeURIComponent(params.category as string)

  const fetchData = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true)
    setError(null)
    try {
      const [materialsRes, brandsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/materials?category=${encodeURIComponent(decodedCategory)}`, { signal }),
        fetch('http://localhost:5000/api/materialbrands', { signal })
      ])
      
      if (!materialsRes.ok || !brandsRes.ok) {
        throw new Error(`Failed to fetch data: Materials ${materialsRes.status}, Brands ${brandsRes.status}`)
      }

      const [materialsData, brandsData] = await Promise.all([
        materialsRes.json(),
        brandsRes.json()
      ])

      setMaterials(materialsData)
      setBrands(brandsData)
      setRetryCount(0)
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Fetch aborted')
        return
      }
      console.error('Error fetching data:', error)
      setError('Failed to load materials. Retrying...')
      if (retryCount < 3) {
        setRetryCount(prevCount => prevCount + 1)
      } else {
        setError('Failed to load materials after multiple attempts. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [decodedCategory, retryCount])

  useEffect(() => {
    const abortController = new AbortController()
    const signal = abortController.signal

    fetchData(signal)

    const retryTimer = retryCount > 0 && retryCount < 3 ? setTimeout(() => fetchData(signal), 1000) : null

    return () => {
      abortController.abort()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [fetchData, retryCount])

  const filteredMaterials = materials.filter(material => {
    const brand = brands.find(b => b.brand_id === material.brand_id)
    return searchTerm === '' || 
      brand?.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.mat_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.mat_sku.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    const nameA = brands.find(brand => brand.brand_id === a.brand_id)?.brand_name || a.mat_name
    const nameB = brands.find(brand => brand.brand_id === b.brand_id)?.brand_name || b.mat_name
    return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
  })

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-2" onClick={() => router.push('/categories')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-[#3D3B54]">{decodedCategory}</h1>
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          Loading materials... {retryCount > 0 && `(Retry attempt ${retryCount}/3)`}
        </div>
      ) : materials.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Materials Found</AlertTitle>
          <AlertDescription>There are no materials available for this category.</AlertDescription>
        </Alert>
      ) : filteredMaterials.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Results</AlertTitle>
          <AlertDescription>No materials match your search criteria. Try adjusting your search term.</AlertDescription>
        </Alert>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto flex-1">
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
    </div>
  )
}