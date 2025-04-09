"use client"

import type { UIMessage } from "ai"
import cx from "classnames"
import { AnimatePresence, motion } from "framer-motion"
import { memo, useState } from "react"
import type { Vote } from "@/lib/db/schema"
import { DocumentToolCall, DocumentToolResult } from "./document"
import { PencilEditIcon, SparklesIcon, ImageIcon } from "./icons"
import { Markdown } from "./markdown"
import { MessageActions } from "./message-actions"
import { PreviewAttachment } from "./preview-attachment"
import { Weather } from "./weather"
import equal from "fast-deep-equal"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { MessageEditor } from "./message-editor"
import { DocumentPreview } from "./document-preview"
import { MessageReasoning } from "./message-reasoning"
import type { UseChatHelpers } from "@ai-sdk/react"
import SearchResults from "./search-results"
import { ChevronDown } from "lucide-react"
import Image from "next/image"
// Animation variants for the collapsible content
const contentVariants = {
  open: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  closed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" },
  },
}

// Tool card component for displaying generic tool calls and results
const ToolCard = ({ toolName, data }: { toolName: string; data: any }) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm mb-2 w-full">
      <button
        type="button"
        className="w-full text-left px-3 py-2"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between w-full">
          <h3 className="text-sm font-medium truncate">{toolName}</h3>
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden w-full"
          >
            <div className="px-3 pb-3 w-full">
              <pre className="bg-muted p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-words text-xs w-full max-w-full">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  chatId: string
  message: UIMessage
  vote: Vote | undefined
  isLoading: boolean
  setMessages: UseChatHelpers["setMessages"]
  reload: UseChatHelpers["reload"]
  isReadonly: boolean
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view")

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:w-fit": mode !== "edit",
            },
          )}
        >
          {message.role === "assistant" && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {message.experimental_attachments && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part
              const key = `message-${message.id}-part-${index}`

              if (type === "reasoning") {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                )
              }

              if (type === "text") {
                if (mode === "view") {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === "user" && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode("edit")
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn("flex flex-col gap-4", {
                          "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                            message.role === "user",
                        })}
                      >
                        <Markdown>{part.text}</Markdown>
                      </div>
                    </div>
                  )
                }

                if (mode === "edit") {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  )
                }
              }

              if (type === "tool-invocation") {
                const { toolInvocation } = part
                const { toolName, toolCallId, state } = toolInvocation

                if (state === "call") {
                  const { args } = toolInvocation

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ["getWeather", "webSearch"].includes(
                          toolName,
                        ),
                      })}
                    >
                      {toolName === "webSearch" ? (
                        <SearchResults />
                      ) : toolName === "getWeather" ? (
                        <Weather />
                      ) : toolName.startsWith("generate_image_using_") ? (
                        <div className="relative p-4 border rounded-md bg-muted/50 flex flex-col items-center">
                          <div className="w-full h-32 flex items-center justify-center bg-muted/50 rounded-md animate-pulse mb-2">
                            <ImageIcon size={32} />
                          </div>
                          <p className="text-sm text-muted-foreground animate-pulse">
                            Generating image...
                          </p>
                        </div>
                      ) : toolName === "createDocument" ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === "updateDocument" ? (
                        <DocumentToolCall
                          type="update"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "requestSuggestions" ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "requestContractFields" ? (
                        <DocumentToolCall
                          type="request-fields"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : (
                        <ToolCard toolName={toolName} data={args} />
                      )}
                    </div>
                  )
                }

                if (state === "result") {
                  const { result } = toolInvocation

                  return (
                    <div key={toolCallId}>
                      {toolName === "webSearch" ? (
                        <SearchResults results={result} />
                      ) : toolName === "getWeather" ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName.startsWith("generate_image_using_") ? (
                        <div className="relative p-4 border rounded-md bg-muted/50">
                          {result?.url ? (
                            <div className="flex flex-col">
                              <Image
                                width={1000}
                                height={1000}
                                src={result.url}
                                alt={result.alt || "Generated image"}
                                className="w-full rounded-md object-contain"
                                style={{ maxHeight: "400px" }}
                              />
                              {result.prompt && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Prompt: {result.prompt}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-destructive">
                              Image generation failed
                            </p>
                          )}
                        </div>
                      ) : toolName === "createDocument" ? (
                        <DocumentPreview
                          isReadonly={isReadonly}
                          result={result}
                        />
                      ) : toolName === "updateDocument" ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "requestSuggestions" ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "requestContractFields" ? (
                        <DocumentToolResult
                          type="request-fields"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "sendDocumentForSigning" ? (
                        <div className="p-4 border rounded-md bg-muted/50 text-sm">
                          <p className="font-medium mb-1">
                            Send for Signing Result:
                          </p>
                          <p>{result?.message || JSON.stringify(result)}</p>
                          {typeof result?.linksGenerated === "number" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Links Generated: {result.linksGenerated}
                            </p>
                          )}
                        </div>
                      ) : (
                        <ToolCard toolName={toolName} data={result} />
                      )}
                    </div>
                  )
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false
    if (prevProps.message.id !== nextProps.message.id) return false
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false
    if (!equal(prevProps.vote, nextProps.vote)) return false

    return true
  },
)

export const ThinkingMessage = () => {
  const role = "assistant"

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          "flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl",
          {
            "group-data-[role=user]/message:bg-muted": true,
          },
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  )
}
