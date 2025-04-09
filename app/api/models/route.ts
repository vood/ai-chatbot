import { NextResponse } from "next/server"
import { auth } from "@/lib/supabase/server"
import { getAgentsForUser } from "@/lib/db/queries/agents"
import type { OpenRouterModel } from "@/types"

export async function GET() {
  try {
    // Get regular models from OpenRouter
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/frontend/models",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
      },
    )

    if (!openRouterResponse.ok) {
      throw new Error(
        `Failed to fetch models from OpenRouter: ${openRouterResponse.statusText}`,
      )
    }

    const openRouterData = await openRouterResponse.json()

    // Fetch agents for the current user
    const user = await auth()
    let agentModels: OpenRouterModel[] = []

    const modelMap = openRouterData.data.reduce(
      (acc: Record<string, OpenRouterModel>, model: OpenRouterModel) => {
        acc[model.slug] = model
        return acc
      },
      {} as Record<string, OpenRouterModel>,
    )

    if (user) {
      const workspaceId = user.current_workspace
      if (workspaceId) {
        const agents = await getAgentsForUser(user.id, workspaceId)

        // Convert agents to model format compatible with model-selector
        agentModels = agents.map((agent) => ({
          slug: `agent/${agent.id}`,
          name: agent.name,
          short_name: agent.name,
          description: agent.description || agent.prompt,
          created_at: agent.created_at,
          context_length:
            agent.context_length || modelMap[agent.model]?.context_length,
          author: "agent",
          endpoint: {
            provider_info: {
              name: "Agent",
              displayName: "Agent",
              isPrimaryProvider: true,
              icon: {
                url: agent.image_path || "/assets/agent-icon.svg",
              },
            },
            provider_display_name: "Agent",
            provider_name: "custom_agent",
            // fetch pricing from openrouter models
            pricing: modelMap[agent.model]?.endpoint?.pricing || {
              prompt: "0",
              completion: "0",
            },
            supports_tool_parameters: true,
            context_length:
              agent.context_length || modelMap[agent.model]?.context_length,
          },
          is_agent: true,
        }))
      }
    }

    // Combine OpenRouter models with agent models
    const combinedModels = {
      data: [...openRouterData.data, ...agentModels],
    }

    return NextResponse.json(combinedModels)
  } catch (error) {
    console.error("Error fetching models:", error)
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    )
  }
}
