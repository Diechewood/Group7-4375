'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp, Bell, Star, HelpCircle, Menu, Search } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from 'next/link'
import Image from 'next/image'

type Material = {
  name: string
  inventory: number
  goal: number
  revenue: number
  msrp: number
  variants?: Material[]
}

const csvData = `Name,Inventory,Goal,P. REV,MSRP
CHICKEN,24,30,$288,$12
white,12,15,$144,$12
brown,12,15,$144,$12
OPOSSOM,2,4,$30,$15
PENGUIN,10,16,$140,$14
BURGER,2,2,$30,$15
WHALE,4,6,$56,$14`

const parseCsvData = (csv: string): Material[] => {
  const lines = csv.split('\n')
  const headers = lines[0].split(',')
  const data: Material[] = []
  let currentParent: Material | null = null

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const item: Material = {
      name: values[0],
      inventory: parseInt(values[1]),
      goal: parseInt(values[2]),
      revenue: parseFloat(values[3].replace('$', '')),
      msrp: parseFloat(values[4].replace('$', ''))
    }

    if (item.name === item.name.toUpperCase()) {
      if (currentParent) {
        data.push(currentParent)
      }
      currentParent = { ...item, variants: [] }
    } else if (currentParent) {
      currentParent.variants?.push(item)
    }
  }

  if (currentParent) {
    data.push(currentParent)
  }

  return data
}

export function MaterialCategory() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [sortMethod, setSortMethod] = useState("dateAdded")

  useEffect(() => {
    const parsedData = parseCsvData(csvData)
    setMaterials(parsedData)
  }, [])

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    )
  }

  const handleQuantityChange = (name: string, amount: number) => {
    setQuantities(prev => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) + amount)
    }))
  }

  const filteredMaterials = materials.filter(material => 
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.variants?.some(variant => variant.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (sortMethod === "dateAdded") {
      return 0 // Placeholder for date added sorting
    } else if (sortMethod === "name") {
      return a.name.localeCompare(b.name)
    }
    return 0
  })

  return (
    <div className="flex flex-col min-h-screen bg-purple-100 text-gray-800">
      {/* Top Navbar */}
      <header className="bg-[#4A4A7C] text-white p-4 flex justify-between items-center z-10">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 md:hidden text-white hover:text-purple-200">
            <Menu />
          </Button>
          <Link href="/dashboard" className="flex items-center">
            <Image src="/placeholder.svg" alt="Frosted Fabrics Logo" width={32} height={32} className="mr-2" />
            <h1 className="text-xl font-bold text-white">Frosted Fabrics</h1>
          </Link>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-white hover:text-purple-200"><Bell /></Button>
          <Button variant="ghost" size="icon" className="text-white hover:text-purple-200"><Star /></Button>
          <Button variant="ghost" size="icon" className="text-white hover:text-purple-200"><HelpCircle /></Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-purple-200 p-4 hidden md:block h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto">
          <nav>
            <ul className="space-y-2">
              <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Menu className="mr-2" />Dashboard</Button></li>
              <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Menu className="mr-2" />Products</Button></li>
              <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Menu className="mr-2" />Materials</Button></li>
              <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Menu className="mr-2" />To-do List</Button></li>
              <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Menu className="mr-2" />Events</Button></li>
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:ml-64 mt-16">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="icon" className="mr-2 text-gray-800 hover:text-purple-700">
              <ChevronLeft />
            </Button>
            <h2 className="text-2xl font-bold text-gray-800">CROCHET</h2>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                placeholder="Search materials..."
                className="pl-8 text-gray-800 placeholder-gray-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-800">Sort by:</span>
              <Select value={sortMethod} onValueChange={setSortMethod}>
                <SelectTrigger className="w-[180px] text-gray-800 border-gray-400">
                  <SelectValue placeholder="Sort method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dateAdded">Date Added</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-purple-200">
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Quick Add</th>
                  <th className="p-2 text-left">INV / GOAL</th>
                  <th className="p-2 text-left">P. REV</th>
                  <th className="p-2 text-left">MSRP</th>
                </tr>
              </thead>
              <tbody>
                {sortedMaterials.map((material) => (
                  <>
                    <tr key={material.name} className="border-b border-gray-200">
                      <td className="p-2">
                        <div className="flex items-center">
                          {material.name}
                          {material.variants && material.variants.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2"
                              onClick={() => toggleExpand(material.name)}
                            >
                              {expandedItems.includes(material.name) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        {(!material.variants || material.variants.length === 0) && (
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(material.name, -1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={quantities[material.name] || 0}
                              onChange={(e) => setQuantities(prev => ({ ...prev, [material.name]: parseInt(e.target.value) || 0 }))}
                              className="w-16 text-center"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(material.name, 1)}
                            >
                              +
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="p-2">{material.inventory} / {material.goal}</td>
                      <td className="p-2">${material.revenue}</td>
                      <td className="p-2">${material.msrp}</td>
                    </tr>
                    {material.variants && expandedItems.includes(material.name) && material.variants.map((variant) => (
                      <tr key={variant.name} className="bg-gray-50 border-b border-gray-200">
                        <td className="p-2 pl-8">{variant.name}</td>
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(variant.name, -1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={quantities[variant.name] || 0}
                              onChange={(e) => setQuantities(prev => ({ ...prev, [variant.name]: parseInt(e.target.value) || 0 }))}
                              className="w-16 text-center"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(variant.name, 1)}
                            >
                              +
                            </Button>
                          </div>
                        </td>
                        <td className="p-2">{variant.inventory} / {variant.goal}</td>
                        <td className="p-2">${variant.revenue}</td>
                        <td className="p-2">${variant.msrp}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}