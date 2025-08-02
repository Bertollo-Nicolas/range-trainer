'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X, Home, Dumbbell, Timer, Brain, BarChart3 } from "lucide-react"

export function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { href: "/", label: "Editor", icon: Home },
    { href: "/trainer", label: "Trainer", icon: Dumbbell },
    { href: "/mind", label: "Mind", icon: Brain },
    { href: "/pomodoro", label: "Pomodoro", icon: Timer },
    { href: "/anki", label: "Anki", icon: Brain },
    { href: "/stats", label: "Stats", icon: BarChart3 },
  ]

  // En mobile, on montre Trainer et Anki
  const mobileLinks = [
    { href: "/trainer", label: "Trainer", icon: Dumbbell },
    { href: "/anki", label: "Anki", icon: Brain },
  ]

  const NavLink = ({ href, label, icon: Icon, mobile = false }: { 
    href: string; 
    label: string; 
    icon: any;
    mobile?: boolean 
  }) => {
    const isActive = pathname === href
    
    if (mobile) {
      return (
        <Link 
          href={href}
          onClick={() => setIsOpen(false)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
            "hover:bg-accent hover:scale-[1.02]",
            isActive 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "text-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="font-medium">{label}</span>
        </Link>
      )
    }

    return (
      <Link 
        href={href}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
          "hover:bg-accent hover:scale-105",
          isActive 
            ? "bg-primary text-primary-foreground shadow-lg" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="font-medium text-sm">{label}</span>
      </Link>
    )
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-center lg:justify-center">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            {links.map((link) => (
              <NavLink 
                key={link.href} 
                href={link.href} 
                label={link.label} 
                icon={link.icon}
              />
            ))}
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden absolute right-4">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-10 w-10 p-0 hover:bg-accent transition-colors"
                >
                  {isOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Header mobile */}
                  <div className="flex items-center gap-3 p-6 border-b bg-muted/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold">
                      RT
                    </div>
                    <div>
                      <div className="font-bold text-lg">Range Trainer</div>
                      <div className="text-sm text-muted-foreground">Poker Training Suite</div>
                    </div>
                  </div>
                  
                  {/* Navigation mobile */}
                  <div className="flex-1 p-6">
                    <div className="space-y-2">
                      {mobileLinks.map((link) => (
                        <NavLink 
                          key={link.href} 
                          href={link.href} 
                          label={link.label} 
                          icon={link.icon}
                          mobile 
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Footer mobile */}
                  <div className="p-6 border-t bg-muted/30">
                    <div className="text-center text-sm text-muted-foreground">
                      Made with ❤️ for poker players
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}