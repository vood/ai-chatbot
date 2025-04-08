'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/supabase/types';
import { useAgents } from '@/hooks/use-agents';
import { PageHeader } from '@/components/ui/page-header';
import { AgentList } from '@/app/(main)/agents/components/agent-list';
import { AgentDialog } from '@/app/(main)/agents/components/agent-dialog';
import { DeleteAgentDialog } from '@/app/(main)/agents/components/delete-agent-dialog';

// Agent type
type Agent = Tables<'assistants'> & { files?: Tables<'files'>[] };

export default function AgentsPage() {
  const { agents, loading, refetchAgents } = useAgents();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | undefined>(
    undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentStoragePath, setAgentStoragePath] = useState<
    string | undefined
  >();
  const [agentFiles, setAgentFiles] = useState<any[]>([]);

  // Function to extract storage path from public URL
  const getStoragePathFromUrl = (
    url: string | null | undefined,
  ): string | undefined => {
    if (!url) return undefined;
    try {
      const urlParts = new URL(url);
      const pathPrefix = `/storage/v1/object/public/assistant_images/`;
      if (urlParts.pathname.startsWith(pathPrefix)) {
        return urlParts.pathname.substring(pathPrefix.length);
      }
    } catch (e) {
      console.error('Error parsing image URL for storage path:', e);
    }
    return undefined;
  };

  const handleAddAgent = async (formData: any) => {
    setIsSubmitting(true);
    try {
      // The formData from agent-form already includes the properly processed files array
      // We don't need to modify it, just pass it through
      console.log('Calling API to add agent:', formData);
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add agent from API');
      }

      toast.success('Agent added successfully');
      setShowAddDialog(false);
      refetchAgents();
    } catch (error) {
      console.error('Error adding agent:', error);
      toast.error('Failed to add agent', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAgent = async (agent: Agent) => {
    setSelectedAgentId(agent.id!);
    setSelectedAgent(agent);
    setAgentStoragePath(getStoragePathFromUrl(agent.image_path));
    setAgentFiles(agent.files || []);

    // Fetch files associated with this agen

    setShowEditDialog(true);
  };

  const saveEditedAgent = async (formData: any) => {
    if (!selectedAgentId) return;
    setIsSubmitting(true);
    try {
      // Make sure to include the files in the form data
      const dataWithFiles = {
        ...formData,
      };

      console.log(
        `Calling API to update agent ${selectedAgentId}:`,
        dataWithFiles,
      );
      const response = await fetch(`/api/agents/${selectedAgentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithFiles),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update agent from API');
      }

      toast.success('Agent updated successfully');
      setShowEditDialog(false);
      setSelectedAgentId(null);
      setSelectedAgent(undefined);
      setAgentFiles([]);
      refetchAgents();
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteAgent = () => {
    if (!selectedAgentId || !selectedAgent) return;
    const storagePathToDelete = getStoragePathFromUrl(selectedAgent.image_path);
    setAgentStoragePath(storagePathToDelete);
    setShowEditDialog(false); // Close edit dialog first
    setShowDeleteDialog(true);
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgentId) return;
    setIsSubmitting(true);
    const storagePathToDelete = agentStoragePath;

    try {
      // Delete from DB first
      const response = await fetch(`/api/agents/${selectedAgentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete agent from API');
      }

      // If DB deletion successful, delete image from storage
      if (storagePathToDelete) {
        console.log(
          `Deleting agent image from storage: ${storagePathToDelete}`,
        );
        const supabase = createClient();
        await supabase.storage
          .from('assistant_images')
          .remove([storagePathToDelete])
          .then(({ error: deleteError }) => {
            if (deleteError) {
              console.warn(
                `Failed to delete agent image from storage: ${deleteError.message}`,
              );
              toast.warning(
                'Agent deleted, but failed to remove image from storage.',
              );
            } else {
              console.log('Agent image successfully deleted from storage.');
            }
          });
      }

      toast.success('Agent deleted successfully');
      setShowDeleteDialog(false);
      setSelectedAgentId(null);
      setSelectedAgent(undefined);
      setAgentStoragePath(undefined);
      refetchAgents();
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
      return Promise.reject(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader
        title="Agents"
        description="Create and manage your AI agents."
        actions={[
          {
            label: 'Add Agent',
            onClick: () => {
              setSelectedAgent(undefined);
              setSelectedAgentId(null);
              setShowAddDialog(true);
            },
            icon: <PlusIcon size={16} />,
          },
        ]}
      />
      <main className="flex-1 overflow-auto p-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <AgentList
            agents={agents}
            loading={loading}
            onAddAgent={() => {
              setSelectedAgent(undefined);
              setSelectedAgentId(null);
              setShowAddDialog(true);
            }}
            onEditAgent={handleEditAgent}
          />

          {/* Add Agent Dialog */}
          <AgentDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            title="Add New Agent"
            description="Configure a new agent."
            onSubmit={handleAddAgent}
            isSubmitting={isSubmitting}
          />

          {/* Edit Agent Dialog */}
          <AgentDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            title="Edit Agent"
            description="Update the agent configuration."
            initialData={selectedAgent}
            onSubmit={saveEditedAgent}
            onDelete={confirmDeleteAgent}
            isSubmitting={isSubmitting}
          />

          {/* Delete Confirmation Dialog */}
          <DeleteAgentDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onDelete={handleDeleteAgent}
            isDeleting={isSubmitting}
          />
        </div>
      </main>
    </div>
  );
}
