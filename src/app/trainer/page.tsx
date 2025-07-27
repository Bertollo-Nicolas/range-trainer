'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, Brain } from "lucide-react"

export default function Trainer() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-[calc(100vh-3.5rem)]">
        <main className="flex-1">
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center space-y-8 max-w-4xl">
              <div>
                <h1 className="text-4xl font-bold mb-4">Range Trainer</h1>
                <p className="text-muted-foreground text-lg">
                  Mode d'entraînement pour améliorer vos skills poker
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Range Training
                    </CardTitle>
                    <CardDescription>
                      Entraînez-vous à mémoriser et reconnaître les ranges de poker
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/trainer/range">
                      <Button className="w-full cursor-pointer">
                        Commencer l'entraînement
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Scénario Avancé
                    </CardTitle>
                    <CardDescription>
                      Situations de jeu complexes et analyse de scenarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/trainer/scenarios">
                      <Button className="w-full cursor-pointer">
                        Analyser les scénarios
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}