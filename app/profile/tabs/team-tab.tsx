"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react"

const inviteFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

type InviteFormValues = z.infer<typeof inviteFormSchema>

interface TeamMember {
  email: string
  role: "Owner" | "Member"
  status: "ACTIVE" | "PENDING"
}

export default function TeamTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { email: "artem.vysotsky@gmail.com", role: "Owner", status: "ACTIVE" },
    { email: "hello@writingmate.ai", role: "Member", status: "ACTIVE" },
    { email: "sergey.visotsky.work@gmail.com", role: "Member", status: "ACTIVE" },
  ])

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  })

  function onSubmit(data: InviteFormValues) {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      console.log(data)
      setIsLoading(false)
      form.reset()
      toast.success("Invitation sent", {
        description: `An invitation has been sent to ${data.email}.`,
      })
    }, 1000)
  }

  function handleRoleChange(email: string, newRole: "Owner" | "Member") {
    setTeamMembers((members) =>
      members.map((member) => (member.email === email ? { ...member, role: newRole } : member)),
    )
  }

  function handleRemoveMember(email: string) {
    if (email === "artem.vysotsky@gmail.com") {
      toast.error("Cannot remove owner", {
        description: "You cannot remove the workspace owner.",
      })
      return
    }

    setTeamMembers((members) => members.filter((member) => member.email !== email))
    toast.success("Team member removed", {
      description: `${email} has been removed from the team.`,
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-medium">Invite User to the Team</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Enter email address" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              Invite
            </Button>
          </form>
        </Form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-medium">Team Members</h2>
        <div className="border rounded-md">
          <div className="grid grid-cols-4 gap-4 p-4 border-b font-medium">
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {teamMembers.map((member) => (
            <div key={member.email} className="grid grid-cols-4 gap-4 p-4 border-b last:border-0 items-center">
              <div className="truncate">{member.email}</div>
              <div>
                <Select
                  value={member.role}
                  onValueChange={(value) => handleRoleChange(member.email, value as "Owner" | "Member")}
                  disabled={member.email === "artem.vysotsky@gmail.com"}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>{member.status}</div>
              <div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemoveMember(member.email)}
                  disabled={member.email === "artem.vysotsky@gmail.com"}
                  className={member.email === "artem.vysotsky@gmail.com" ? "opacity-0" : ""}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove team member</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

