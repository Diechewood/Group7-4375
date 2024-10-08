import Link from 'next/link'
import Image from 'next/image'
import { Bell, Star, HelpCircle, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function Header() {
  return (
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
  )
}