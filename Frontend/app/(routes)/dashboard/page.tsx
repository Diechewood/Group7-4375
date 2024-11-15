'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Plus, CalendarIcon, Edit, Trash, Loader2 } from 'lucide-react'
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
  const [productAlerts, setProductAlerts] = useState<(ProductVariation & Partial<Product>)[]>([])
  const [materialAlerts, setMaterialAlerts] = useState<Material[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [categories, setCategories] = useState<CalendarCategory[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ event_title: '', event_timestamp: new Date().toISOString() })
  const [newCategory, setNewCategory] = useState<Partial<CalendarCategory>>({ cc_name: '', cc_hex: '#000000' })
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<CalendarCategory | null>(null)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)

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
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddEvent = async () => {
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
        setNewEvent({ event_title: '', event_timestamp: new Date().toISOString() })
      } else {
        console.error('Failed to add event')
      }
    } catch (error) {
      console.error('Error adding event:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async (category: CalendarCategory) => {
    setCategoryToDelete(category)
    setShowDeleteWarning(true)
  }

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/calendarcategories/${categoryToDelete.cc_id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
        setShowDeleteWarning(false)
        setCategoryToDelete(null)
      } else {
        console.error('Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    } finally {
      setIsLoading(false)
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
        setNewEvent({ event_title: '', event_timestamp: new Date().toISOString() })
        setEditingEventId(null)
      } else {
        console.error('Failed to update event')
      }
    } catch (error) {
      console.error('Error updating event:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/calendarevents/${eventId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
      } else {
        console.error('Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
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
        setIsAddingCategory(false)
        setNewCategory({ cc_name: '', cc_hex: '#000000' })
      } else {
        console.error('Failed to add category')
      }
    } catch (error) {
      console.error('Error adding category:', error)
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-black text-3xl font-bold mb-6">Dashboard</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Calendar
            <div>
              <Button onClick={() => setIsAddingCategory(true)} size="sm" className="mr-2 bg-[#4A4A7C]">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
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
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              {...props}
                              className={cn(
                                "w-8 h-8 p-0 font-normal aria-selected:opacity-100 rounded-md transition-colors",
                                hasEvent && "text-white hover:opacity-80",
                                !hasEvent && "hover:bg-gray-100",
                                isOutsideMonth && "text-muted-foreground opacity-50"
                              )}
                              style={hasEvent ? { 
                                backgroundColor: dateEvents[0].cc_hex,
                                opacity: 0.8
                              } : {}}
                              onClick={(e) => {
                                e.preventDefault()
                                if (!isOutsideMonth) {
                                  handleDayClick(date)
                                }
                              }}
                            >
                              {date.getDate()}
                            </button>
                          </TooltipTrigger>
                          {hasEvent && !isOutsideMonth && (
                            <TooltipContent className="bg-[#4A4A7C] border-none text-white">
                              {dateEvents.map((event, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: event.cc_hex }}
                                  />
                                  {event.event_title}
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
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <div key={event.event_id} className="bg-white p-3 rounded-lg shadow flex justify-between items-start">
                        <div>
                          <div className="font-medium" style={{ color: event.cc_hex }}>{event.event_title}</div>
                          <div className="text-xs text-muted-foreground mb-1">{event.cc_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(event.event_timestamp)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="hover:bg-[#E5D5FF]" onClick={() => {
                            setNewEvent(event)
                            setEditingEventId(event.event_id)
                            setIsEditingEvent(true)
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-[#E5D5FF]" onClick={() => handleDeleteEvent(event.event_id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 bg-[#4A4A7C] border-black border-lg">
          <CardHeader>
            <CardTitle className="text-white">Product Variation Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)]">
              {productAlerts.map((item) => (
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
            <CardTitle className="text-white">Material Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)]">
              {materialAlerts.map((item) => (
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
          setNewEvent({ event_title: '', event_timestamp: new Date().toISOString() })
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
                Title
              </Label>
              <Input
                id="event-title"
                value={newEvent.event_title}
                onChange={(e) => setNewEvent({ ...newEvent, event_title: e.target.value })}
                className="col-span-3 bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-category" className="text-right">
                Category
              </Label>
              <Select
                value={newEvent.cc_id?.toString()}
                onValueChange={(value) => setNewEvent({ ...newEvent, cc_id: parseInt(value) })}
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
                Date
              </Label>
              <Input
                id="event-date"
                type="datetime-local"
                value={newEvent.event_timestamp?.slice(0, 16)}
                onChange={(e) => setNewEvent({ ...newEvent, event_timestamp: new Date(e.target.value).toISOString() })}
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

      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent className="sm:max-w-[425px] bg-[#4A4A7C] text-white border-none">
          <DialogHeader>
            <DialogTitle>Categories</DialogTitle>
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
              <Label htmlFor="category-color" className="text-right">
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
                      <span>{category.cc_name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-white/20"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={isLoading}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAddCategory}
              disabled={isLoading}
              className="bg-white text-[#4A4A7C] hover:bg-white/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <DialogContent className="sm:max-w-[425px] bg-[#4A4A7C] text-white border-none">
          <DialogHeader>
            <DialogTitle>Warning</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Deleting the category "{categoryToDelete?.cc_name}" will also delete all associated events. Are you sure you want to proceed?</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteWarning(false)}
              variant="outline"
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDeleteCategory}
              disabled={isLoading}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}