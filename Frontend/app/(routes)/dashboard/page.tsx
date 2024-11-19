'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Plus, CalendarIcon, Edit, Trash, Loader2, Settings, Check, X, ChevronDown } from 'lucide-react'
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

interface ProductVariation {
  var_id: number
  var_name: string
  var_inv: number
  var_goal: number
  prod_id: number
}

interface Product {
  prod_id: number
  prod_name: string
  pc_name: string
}

interface Material {
  mat_name: string
  mat_inv: number
  mat_alert: number
  mc_name: string
}

interface CalendarCategory {
  cc_id: number
  cc_name: string
  cc_hex: string
}

interface CalendarEvent {
  event_id: number
  cc_id: number
  event_title: string
  event_subtitle?: string
  event_notes?: string
  event_link?: string
  event_timestamp: string
  cc_name: string
  cc_hex: string
}

export default function DashboardPage() {
  const { toast } = useToast()
  const [productAlerts, setProductAlerts] = useState<(ProductVariation & Partial<Product>)[]>([])
  const [materialAlerts, setMaterialAlerts] = useState<Material[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [categories, setCategories] = useState<CalendarCategory[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ 
    event_title: '', 
    event_timestamp: new Date().toISOString(),
    event_subtitle: '',
    event_notes: '',
    event_link: ''
  })
  const [newCategory, setNewCategory] = useState<Partial<CalendarCategory>>({ cc_name: '', cc_hex: '#000000' })
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [filterCategory, setFilterCategory] = useState<number | 'all'>('all')
  const [filterDateRange, setFilterDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null })
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editedCategoryName, setEditedCategoryName] = useState('')
  const [selectedProductCategories, setSelectedProductCategories] = useState<string[]>([])
  const [selectedMaterialCategories, setSelectedMaterialCategories] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsRefreshing(true)
    try {
      const [productVariationsRes, productsRes, materialRes, categoriesRes, eventsRes] = await Promise.all([
        fetch('http://localhost:5000/api/productvariations'),
        fetch('http://localhost:5000/api/products'),
        fetch('http://localhost:5000/api/materials'),
        fetch('http://localhost:5000/api/calendarcategories'),
        fetch('http://localhost:5000/api/calendarevents')
      ])

      const [productVariations, products, materialData, categoriesData, eventsData] = await Promise.all([
        productVariationsRes.json(),
        productsRes.json(),
        materialRes.json(),
        categoriesRes.json(),
        eventsRes.json()
      ])

      const lowInventoryProducts = productVariations.filter((item: ProductVariation) => item.var_inv < item.var_goal)
      const productMap: Map<number, Product> = new Map(
        products.map((product: Product) => [product.prod_id, product])
      )
      const enhancedProductData = lowInventoryProducts.map((variation: ProductVariation) => ({
        ...variation,
        ...productMap.get(variation.prod_id)
      }))

      setProductAlerts(enhancedProductData)
      setMaterialAlerts(materialData.filter((item: Material) => item.mat_inv < item.mat_alert))
      setCategories(categoriesData)
      setEvents(eventsData)
      
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddEvent = async () => {
    if (!newEvent.event_title || !newEvent.cc_id || !newEvent.event_timestamp) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Title, Category, and Date).",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/calendarevents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      })

      if (response.status === 201) {
        await fetchData()
        setIsAddingEvent(false)
        setNewEvent({ 
          event_title: '', 
          event_timestamp: new Date().toISOString(),
          event_subtitle: '',
          event_notes: '',
          event_link: ''
        })
        toast({
          title: "Success",
          description: "Event added successfully",
        })
      } else {
        throw new Error('Failed to add event')
      }
    } catch (error) {
      console.error('Error adding event:', error)
      toast({
        title: "Error",
        description: "Failed to add event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async (category: CalendarCategory) => {
    setIsDeletingCategory(true)
    try {
      const response = await fetch(`http://localhost:5000/api/calendarcategories/${category.cc_id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
        setIsManagingCategories(false)
        toast({
          title: "Success",
          description: "Category deleted successfully",
        })
      } else {
        throw new Error('Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingCategory(false)
    }
  }

  const handleEditEvent = async () => {
    if (!editingEventId) return
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/calendarevents/${editingEventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      })

      if (response.ok) {
        await fetchData()
        setIsEditingEvent(false)
        setNewEvent({ 
          event_title: '', 
          event_timestamp: new Date().toISOString(),
          event_subtitle: '',
          event_notes: '',
          event_link: ''
        })
        setEditingEventId(null)
        toast({
          title: "Success",
          description: "Event updated successfully",
        })
      } else {
        throw new Error('Failed to update event')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: number) => {
    setIsDeletingEvent(true)
    try {
      const response = await fetch(`http://localhost:5000/api/calendarevents/${eventId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
        setShowEventDetails(false)
        toast({
          title: "Success",
          description: "Event deleted successfully",
        })
      } else {
        throw new Error('Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingEvent(false)
    }
  }

  const handleAddCategory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/calendarcategories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      })

      if (response.status === 201) {
        await fetchData()
        setNewCategory({ cc_name: '', cc_hex: '#000000' })
        toast({
          title: "Success",
          description: "Category added successfully",
        })
      } else {
        throw new Error('Failed to add category')
      }
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCategory = async (categoryId: number, updatedCategory: Partial<CalendarCategory>) => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/calendarcategories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCategory),
      })

      if (response.ok) {
        await fetchData()
        toast({
          title: "Success",
          description: "Category updated successfully",
        })
      } else {
        throw new Error('Failed to update category')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      new Date(event.event_timestamp).toDateString() === date.toDateString()
    )
  }

  const handleDayClick = (date: Date | undefined) => {
    if (date) {
      setNewEvent({ ...newEvent, event_timestamp: date.toISOString() })
      setIsAddingEvent(true)
    }
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP')
  }

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.event_timestamp)
    const categoryMatch = filterCategory === 'all' || event.cc_id === filterCategory
    const dateMatch = 
      (!filterDateRange.start || eventDate >= filterDateRange.start) &&
      (!filterDateRange.end || eventDate <= filterDateRange.end)
    return categoryMatch && dateMatch
  })

  const getContrastColor = (hexcolor: string) => {
    const r = parseInt(hexcolor.slice(1,3), 16)
    const g = parseInt(hexcolor.slice(3,5), 16)
    const b = parseInt(hexcolor.slice(5,7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  const handleEditCategoryStart = (category: CalendarCategory) => {
    setEditingCategoryId(category.cc_id)
    setEditedCategoryName(category.cc_name)
  }

  const handleEditCategoryCancel = () => {
    setEditingCategoryId(null)
    setEditedCategoryName('')
  }

  const handleEditCategoryConfirm = async (categoryId: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/calendarcategories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cc_name: editedCategoryName }),
      })

      if (response.ok) {
        await fetchData()
        setEditingCategoryId(null)
        setEditedCategoryName('')
        toast({
          title: "Success",
          description: "Category updated successfully",
        })
      } else {
        throw new Error('Failed to update category')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-black text-3xl font-bold mb-6">Dashboard</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Calendar
            <div>
              <Button onClick={() => setIsManagingCategories(true)} size="sm" className="mr-2 bg-[#4A4A7C]">
                <Settings className="h-4 w-4 mr-2" />
                Manage Categories
              </Button>
              <Button onClick={() => setIsAddingEvent(true)} size="sm" className="bg-[#4A4A7C]">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#E5D5FF] p-4 rounded-lg flex items-center justify-center">
              <TooltipProvider>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDayClick}
                  className="rounded-md bg-white"
                  modifiers={{
                    event: (date) => getEventsForDate(date).length > 0
                  }}
                  modifiersStyles={{
                    event: {
                      backgroundColor: 'transparent'
                    }
                  }}
                  components={{
                    Day: ({ date, displayMonth, ...props }) => {
                      const dateEvents = getEventsForDate(date)
                      const hasEvent = dateEvents.length > 0
                      const isOutsideMonth = date.getMonth() !== displayMonth.getMonth()
                      const isHovered = hoveredDate?.toDateString() === date.toDateString()
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              {...props}
                              className={cn(
                                "w-8 h-8 p-0 font-normal aria-selected:opacity-100 rounded-md transition-colors",
                                hasEvent && "text-white hover:opacity-80",
                                !hasEvent && "hover:bg-gray-100",
                                isOutsideMonth && "text-muted-foreground opacity-50",
                                isHovered && "bg-blue-200"
                              )}
                              style={hasEvent ? { 
                                backgroundColor: dateEvents[0].cc_hex,
                                opacity: isHovered ? 1 : 0.8
                              } : {}}
                              onClick={(e) => {
                                e.preventDefault()
                                if (!isOutsideMonth) {
                                  handleDayClick(date)
                                }
                              }}
                              onMouseEnter={() => setHoveredDate(date)}
                              onMouseLeave={() => setHoveredDate(null)}
                            >
                              {date.getDate()}
                            </button>
                          </TooltipTrigger>
                          {hasEvent && !isOutsideMonth && (
                            <TooltipContent className="bg-[#4A4A7C] border-none text-white">
                              {dateEvents.map((event, index) => (
                                <div key={index} className="flex flex-col gap-1 mb-2">
                                  <div className="font-semibold">{event.event_title}</div>
                                  <div className="text-sm">{event.event_subtitle}</div>
                                  <div className="text-xs">{format(new Date(event.event_timestamp), 'p')}</div>
                                </div>
                              ))}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )
                    },
                  }}
                />
              </TooltipProvider>
            </div>

            <div className="bg-[#E5D5FF] p-4 rounded-lg">
              <div className="mb-4 flex space-x-2">
                <Select value={filterCategory.toString()} onValueChange={(value) => setFilterCategory(value === 'all' ? 'all' : parseInt(value))}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.cc_id} value={category.cc_id.toString()}>{category.cc_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : null }))}
                  className="w-[150px]"
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : null }))}
                  className="w-[150px]"
                  placeholder="End Date"
                />
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => (
                      <div 
                        key={event.event_id} 
                        className="p-3 rounded-lg shadow flex justify-between items-start cursor-pointer"
                        style={{
                          backgroundColor: event.cc_hex,
                          color: getContrastColor(event.cc_hex)
                        }}
                        onClick={() => {
                          setSelectedEvent(event)
                          setShowEventDetails(true)
                        }}
                      >
                        <div>
                          <div className="font-medium">{event.event_title}</div>
                          <div className="text-xs opacity-80 mb-1">{event.event_subtitle || event.cc_name}</div>
                          <div className="text-sm opacity-80">
                            {formatDate(event.event_timestamp)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white/80 p-3 rounded-lg shadow text-center">
                      <div className="text-muted-foreground">No events found</div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Category Legend</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge 
                  key={category.cc_id} 
                  style={{ backgroundColor: category.cc_hex, color: getContrastColor(category.cc_hex) }}
                >
                  {category.cc_name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 bg-[#4A4A7C] border-black border-lg">
          <CardHeader>
            <CardTitle className="text-white flex justify-between items-center">
              Product Variation Alerts
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    Filter <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Product Categories</h4>
                      <p className="text-sm text-muted-foreground">
                        Select the categories you want to see alerts for.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {Array.from(new Set(productAlerts.map(item => item.pc_name))).map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`product-${category}`} 
                            checked={category ? selectedProductCategories.includes(category) : false}
                            onCheckedChange={(checked) => {
                              if (category) {
                                setSelectedProductCategories(prev => 
                                  checked 
                                    ? [...prev, category] 
                                    : prev.filter(c => c !== category)
                                )
                              }
                            }}
                          />
                          <label
                            htmlFor={`product-${category}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {category}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)]">
              {productAlerts
                .filter(item => selectedProductCategories.length === 0 || (item.pc_name && selectedProductCategories.includes(item.pc_name)))
                .map((item) => (
                <Alert key={item.var_id} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Low Inventory</AlertTitle>
                  <AlertDescription>
                    <p><strong>{item.var_name}</strong></p>
                    <p>Product: {item.prod_name}</p>
                    <p>Category: {item.pc_name}</p>
                    <p>Current: {item.var_inv}</p>
                    <p>Goal: {item.var_goal}</p>
                  </AlertDescription>
                </Alert>
              ))}
              {productAlerts.length === 0 && <p className="text-white">No product variation alerts</p>}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="col-span-1 bg-[#4A4A7C] border-black border-lg">
          <CardHeader>
            <CardTitle className="text-white flex justify-between items-center">
              Material Alerts
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    Filter <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Material Categories</h4>
                      <p className="text-sm text-muted-foreground">
                        Select the categories you want to see alerts for.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {Array.from(new Set(materialAlerts.map(item => item.mc_name))).map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`material-${category}`} 
                            checked={category ? selectedMaterialCategories.includes(category) : false}
                            onCheckedChange={(checked) => {
                              if (category) {
                                setSelectedMaterialCategories(prev => 
                                  checked 
                                    ? [...prev, category] 
                                    : prev.filter(c => c !== category)
                                )
                              }
                            }}
                          />
                          <label
                            htmlFor={`material-${category}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {category}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)]">
              {materialAlerts
                .filter(item => selectedMaterialCategories.length === 0 || selectedMaterialCategories.includes(item.mc_name))
                .map((item) => (
                <Alert key={item.mat_name} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Low Inventory</AlertTitle>
                  <AlertDescription>
                    <p><strong>{item.mat_name}</strong></p>
                    <p>Category: {item.mc_name}</p>
                    <p>Current: {item.mat_inv}</p>
                    <p>Alert Threshold: {item.mat_alert}</p>
                  </AlertDescription>
                </Alert>
              ))}
              {materialAlerts.length === 0 && <p className="text-white">No material alerts</p>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddingEvent || isEditingEvent} onOpenChange={(open) => {
        if (!open) {
          setIsAddingEvent(false)
          setIsEditingEvent(false)
          setNewEvent({ 
            event_title: '', 
            event_timestamp: new Date().toISOString(),
            event_subtitle: '',
            event_notes: '',
            event_link: ''
          })
          setEditingEventId(null)
        }
      }}>
        <DialogContent className="sm:max-w-[425px] bg-[#4A4A7C] text-white border-none">
          <DialogHeader>
            <DialogTitle>{isEditingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-title" className="text-right">
                Title*
              </Label>
              <Input
                id="event-title"
                value={newEvent.event_title}
                onChange={(e) => setNewEvent({ ...newEvent, event_title: e.target.value })}
                className="col-span-3 bg-white/10 border-white/20 text-white"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-subtitle" className="text-right">
                Subtitle
              </Label>
              <Input
                id="event-subtitle"
                value={newEvent.event_subtitle}
                onChange={(e) => setNewEvent({ ...newEvent, event_subtitle: e.target.value })}
                className="col-span-3 bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-category" className="text-right">
                Category*
              </Label>
              <Select
                value={newEvent.cc_id?.toString()}
                onValueChange={(value) => setNewEvent({ ...newEvent, cc_id: parseInt(value) })}
                required
              >
                <SelectTrigger className="col-span-3 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-[#4A4A7C] border-white/20">
                  {categories.map((category) => (
                    <SelectItem 
                      key={category.cc_id} 
                      value={category.cc_id.toString()}
                      className="text-white focus:bg-white/20 focus:text-white"
                    >
                      {category.cc_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-date" className="text-right">
                Date*
              </Label>
              <Input
                id="event-date"
                type="datetime-local"
                value={newEvent.event_timestamp?.slice(0, 16)}
                onChange={(e) => setNewEvent({ ...newEvent, event_timestamp: new Date(e.target.value).toISOString() })}
                className="col-span-3 bg-white/10 border-white/20 text-white"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="event-notes"
                value={newEvent.event_notes}
                onChange={(e) => setNewEvent({ ...newEvent, event_notes: e.target.value })}
                className="col-span-3 bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-link" className="text-right">
                Link
              </Label>
              <Input
                id="event-link"
                value={newEvent.event_link}
                onChange={(e) => setNewEvent({ ...newEvent, event_link: e.target.value })}
                className="col-span-3 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={isEditingEvent ? handleEditEvent : handleAddEvent}
              disabled={isLoading}
              className="bg-white text-[#4A4A7C] hover:bg-white/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditingEvent ? 'Update Event' : 'Add Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManagingCategories} onOpenChange={setIsManagingCategories}>
        <DialogContent className="sm:max-w-[425px] bg-[#4A4A7C] text-white border-none">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-name" className="text-right">
                Name
              </Label>
              <Input
                id="category-name"
                value={newCategory.cc_name}
                onChange={(e) => setNewCategory({ ...newCategory, cc_name: e.target.value })}
                className="col-span-3 bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-color"className="text-right">
                Color
              </Label>
              <Input
                id="category-color"
                type="color"
                value={newCategory.cc_hex}
                onChange={(e) => setNewCategory({ ...newCategory, cc_hex: e.target.value })}
                className="col-span-3 bg-white/10 border-white/20 h-10"
              />
            </div>
            <Button 
              onClick={handleAddCategory}
              disabled={isLoading}
              className="bg-white text-[#4A4A7C] hover:bg-white/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Category
            </Button>
            <Separator className="my-4" />
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Existing Categories</h4>
              <div className="grid gap-2">
                {categories.map((category) => (
                  <div key={category.cc_id} className="flex items-center justify-between bg-white/10 p-2 rounded-md">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.cc_hex }}
                      />
                      {editingCategoryId === category.cc_id ? (
                        <Input
                          value={editedCategoryName}
                          onChange={(e) => setEditedCategoryName(e.target.value)}
                          className="bg-transparent border-none text-white"
                        />
                      ) : (
                        <span>{category.cc_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={category.cc_hex}
                        onChange={(e) => handleEditCategory(category.cc_id, { ...category, cc_hex: e.target.value })}
                        className="w-8 h-8 p-0 border-none"
                      />
                      {editingCategoryId === category.cc_id ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="hover:bg-white/20"
                            onClick={() => handleEditCategoryConfirm(category.cc_id)}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="hover:bg-white/20"
                            onClick={handleEditCategoryCancel}
                            disabled={isLoading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="hover:bg-white/20"
                          onClick={() => handleEditCategoryStart(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="hover:bg-white/20"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={isDeletingCategory || editingCategoryId === category.cc_id}
                      >
                        {isDeletingCategory ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="sm:max-w-[425px] bg-[#4A4A7C] text-white border-none">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.event_title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p><strong>Subtitle:</strong> {selectedEvent?.event_subtitle}</p>
            <p><strong>Category:</strong> {selectedEvent?.cc_name}</p>
            <p><strong>Date:</strong> {selectedEvent && formatDate(selectedEvent.event_timestamp)}</p>
            <p><strong>Notes:</strong> {selectedEvent?.event_notes}</p>
            {selectedEvent?.event_link && (
              <p><strong>Link:</strong> <a href={selectedEvent.event_link} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">{selectedEvent.event_link}</a></p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setNewEvent(selectedEvent as CalendarEvent)
                setEditingEventId(selectedEvent?.event_id || null)
                setIsEditingEvent(true)
                setShowEventDetails(false)
              }}
              className="bg-white text-[#4A4A7C] hover:bg-white/90 mr-2"
            >
              Edit
            </Button>
            <Button 
              onClick={() => {
                if (selectedEvent) handleDeleteEvent(selectedEvent.event_id)
              }}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={isDeletingEvent}
            >
              {isDeletingEvent ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}