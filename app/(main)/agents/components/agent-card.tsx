"use client"

import { SparklesIcon } from "@/components/icons"
import type { Tables } from "@/supabase/types"
import Image from "next/image"
type Agent = Tables<"assistants">

interface AgentCardProps {
  agent: Agent
  onClick: (agent: Agent) => void
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <div
      key={agent.id}
      onClick={() => onClick(agent)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick(agent)
        }
      }}
      className="flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Display Agent Image (from image_path) or Fallback Icon */}
      <div className="mb-2 flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary overflow-hidden">
        {agent.image_path ? (
          <Image
            width={128}
            height={128}
            src={agent.image_path}
            alt={`${agent.name} logo`}
            className="h-full w-full object-cover"
          />
        ) : (
          <SparklesIcon size={20} />
        )}
      </div>
      <h3 className="font-semibold mb-1 truncate w-full" title={agent.name}>
        {agent.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-grow">
        {agent.description || agent.prompt}
      </p>
    </div>
  )
}
