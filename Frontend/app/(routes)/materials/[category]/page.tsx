'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, ArrowUpDown, AlertCircle, ChevronDown, ChevronRight, X, Check } from 'lucide-react'
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

interface GroupedMaterials {
  [key: number]: Material[]
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
  const [expandedBrands, setExpandedBrands] = useState<Set<number>>(new Set())
  const [editingInventory, setEditingInventory] = useState<{ [key: number]: string }>({})

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

  const groupedMaterials = filteredMaterials.reduce((acc: GroupedMaterials, material) => {
    if (!acc[material.brand_id]) {
      acc[material.brand_id] = []
    }
    acc[material.brand_id].push(material)
    return acc
  }, {})

  const sortedBrandIds = Object.keys(groupedMaterials)
    .map(Number)
    .sort((a, b) => {
      const brandA = brands.find(brand => brand.brand_id === a)?.brand_name || ''
      const brandB = brands.find(brand => brand.brand_id === b)?.brand_name || ''
      return sortDirection === 'asc' ? brandA.localeCompare(brandB) : brandB.localeCompare(brandA)
    })

  const toggleBrand = (brandId: number) => {
    setExpandedBrands(prev => {
      const next = new Set(prev)
      if (next.has(brandId)) {
        next.delete(brandId)
      } else {
        next.add(brandId)
      }
      return next
    })
  }

  const handleEditInventory = (materialId: number, currentInventory: number) => {
    setEditingInventory(prev => ({ ...prev, [materialId]: currentInventory.toString() }))
  }

  const handleCancelEdit = (materialId: number) => {
    setEditingInventory(prev => {
      const next = { ...prev }
      delete next[materialId]
      return next
    })
  }

  const handleUpdateInventory = async (materialId: number) => {
    const newInventory = parseFloat(editingInventory[materialId])
    if (isNaN(newInventory)) {
      alert('Please enter a valid number for inventory.')
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mat_inv: newInventory }),
      })

      if (!response.ok) {
        throw new Error('Failed to update inventory')
      }

      setMaterials(prevMaterials =>
        prevMaterials.map(material =>
          material.mat_id === materialId ? { ...material, mat_inv: newInventory } : material
        )
      )

      handleCancelEdit(materialId)
    } catch (error) {
      console.error('Error updating inventory:', error)
      alert('Failed to update inventory. Please try again.')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-2 text-gray-800" onClick={() => router.push('/materials')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">{decodedCategory}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600" />
            <Input
              type="text"
              placeholder="Search materials..."
              className="pl-8 w-64 border-gray-300 text-gray-800 placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="text-gray-800 border-gray-300"
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
        <div className="text-center py-8 text-gray-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
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
        <div className="bg-white rounded-lg shadow overflow-x-auto flex-1 border border-gray-300">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="p-2 text-gray-800 text-left font-semibold">Brand/Name</th>
                <th className="p-2 text-gray-800 text-left font-semibold">#</th>
                <th className="p-2 text-gray-800 text-left font-semibold">Inv (oz)</th>
                <th className="p-2 text-gray-800 text-left font-semibold">Edit Inv</th>
                <th className="p-2 text-gray-800 text-left font-semibold">Alert(oz)</th>
                <th className="p-2 text-gray-800 text-left font-semibold">$</th>
              </tr>
            </thead>
            <tbody>
              {sortedBrandIds.map((brandId) => {
                const brand = brands.find(b => b.brand_id === brandId)
                const materialsForBrand = groupedMaterials[brandId]
                const isExpanded = expandedBrands.has(brandId)
                const hasMultipleMaterials = materialsForBrand.length > 1

                return (
                  <Fragment key={brandId}>
                    <tr 
                      className={`border-b border-gray-300 ${hasMultipleMaterials ? 'bg-gray-50 cursor-pointer hover:bg-gray-100' : ''}`}
                      onClick={() => hasMultipleMaterials && toggleBrand(brandId)}
                    >
                      <td className="p-2" colSpan={hasMultipleMaterials ? 5 : 1}>
                        <div className="flex items-center">
                          {hasMultipleMaterials && (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 mr-2 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2 text-gray-600" />
                            )
                          )}
                          <span className="font-medium text-gray-800">
                            {hasMultipleMaterials ? brand?.brand_name : materialsForBrand[0].mat_name}
                          </span>
                        </div>
                      </td>
                      {!hasMultipleMaterials && (
                        <>
                          <td className="p-2 text-gray-800">{materialsForBrand[0].mat_sku}</td>
                          <td className="p-2 text-gray-800">{materialsForBrand[0].mat_inv}</td>
                          <td className="p-2 text-gray-800">
                            {editingInventory[materialsForBrand[0].mat_id] !== undefined ? (
                              <div className="flex items-center">
                                <Input
                                  type="number"
                                  value={editingInventory[materialsForBrand[0].mat_id]}
                                  onChange={(e) => setEditingInventory(prev => ({ ...prev, [materialsForBrand[0].mat_id]: e.target.value }))}
                                  className="w-20 mr-2"
                                />
                                <Button size="sm" variant="ghost" onClick={() => handleUpdateInventory(materialsForBrand[0].mat_id)}>
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(materialsForBrand[0].mat_id)}>
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => handleEditInventory(materialsForBrand[0].mat_id, materialsForBrand[0].mat_inv)}>
                                Edit
                              </Button>
                            )}
                          </td>
                          <td className="p-2 text-gray-800">{materialsForBrand[0].mat_alert}</td>
                        </>
                      )}
                      <td className="p-2 font-medium text-gray-800">
                        {brand && typeof brand.brand_price === 'number'
                          ? `$${brand.brand_price.toFixed(2)}`
                          : brand?.brand_price || ''}
                      </td>
                    </tr>
                    {hasMultipleMaterials && isExpanded && materialsForBrand.map((material) => (
                      <tr key={material.mat_id} className="border-b border-gray-300 last:border-b-0 bg-white">
                        <td className="p-2 pl-8 text-gray-800">{material.mat_name}</td>
                        <td className="p-2 text-gray-800">{material.mat_sku}</td>
                        <td className="p-2 text-gray-800">{material.mat_inv}</td>
                        <td className="p-2 text-gray-800">
                          {editingInventory[material.mat_id] !== undefined ? (
                            <div className="flex items-center">
                              <Input
                                type="number"
                                value={editingInventory[material.mat_id]}
                                onChange={(e) => setEditingInventory(prev => ({ ...prev, [material.mat_id]: e.target.value }))}
                                className="w-20 mr-2"
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleUpdateInventory(material.mat_id)}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(material.mat_id)}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => handleEditInventory(material.mat_id, material.mat_inv)}>
                              Edit
                            </Button>
                          )}
                        </td>
                        <td className="p-2 text-gray-800">{material.mat_alert}</td>
                        <td className="p-2 text-gray-800"></td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}