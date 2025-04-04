'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SparklesIcon, TrashIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WandSparklesIcon } from 'lucide-react';

// Define sample prompts
const samplePrompts = [
  {
    id: 'sample-1',
    name: 'Email Summarizer',
    content:
      'Summarize the key points and action items from the following email thread: {email_thread}',
  },
  {
    id: 'sample-2',
    name: 'Meeting Agenda Generator',
    content:
      'Generate a meeting agenda for a {meeting_topic} meeting including sections for: Welcome, Review Previous Action Items, Main Discussion Points ({point1}, {point2}), New Action Items, and Q&A.',
  },
  {
    id: 'sample-3',
    name: 'Code Explainer',
    content:
      'Explain the following code snippet in simple terms, focusing on its purpose and functionality: {code_snippet}',
  },
  {
    id: 'sample-4',
    name: 'Creative Story Starter',
    content:
      'Write the beginning of a short story (approx. 2 paragraphs) based on the following premise: {story_premise}',
  },
  {
    id: 'sample-5',
    name: 'Study Notes Condenser',
    content:
      'Condense the following study notes on {topic} into a bulleted list of the most important concepts and definitions: {notes}',
  },
  {
    id: 'sample-6',
    name: 'Report Outline Creator',
    content:
      'Create a detailed outline for a report on {report_subject}. Include sections for Introduction, Background, Methodology, Findings, Discussion, Conclusion, and Recommendations.',
  },
  {
    id: 'sample-7',
    name: 'Social Media Post Idea',
    content:
      'Generate 3 distinct social media post ideas (for {platform}) to promote {product_or_service}, focusing on {target_audience}.',
  },
  {
    id: 'sample-8',
    name: 'Learning Path Suggestion',
    content:
      'Suggest a learning path for someone wanting to learn {skill}. Include key topics, recommended resources (e.g., books, courses, websites), and potential projects.',
  },
  {
    id: 'sample-9',
    name: 'Blog Post Draft',
    content:
      'Draft a blog post (around 500 words) about {topic}. Include an introduction, 3 main points ({point1}, {point2}, {point3}), and a conclusion with a call to action.',
  },
  {
    id: 'sample-10',
    name: 'Meeting Follow-up Email',
    content:
      'Draft a follow-up email after a meeting about {meeting_subject}. Summarize key decisions, list action items with owners and deadlines ({action_item_1:owner:deadline}, {action_item_2:owner:deadline}), and state next steps.',
  },
  {
    id: 'sample-11',
    name: 'Argumentative Essay Points',
    content:
      'Generate 3 arguments supporting the thesis "{thesis_statement}" and 2 counter-arguments with potential rebuttals for an argumentative essay.',
  },
  {
    id: 'sample-12',
    name: 'Product Description Writer',
    content:
      'Write a compelling product description for {product_name}. Highlight key features ({feature1}, {feature2}), benefits ({benefit1}), and target audience ({audience}). Include a catchy headline.',
  },
  {
    id: 'sample-13',
    name: 'Technical Concept Analogy',
    content:
      'Explain the technical concept of {technical_concept} using a simple analogy that a non-technical person can understand.',
  },
  {
    id: 'sample-14',
    name: 'Job Description Outline',
    content:
      'Create an outline for a job description for a {job_title} position. Include sections for: Job Summary, Responsibilities, Required Qualifications, Preferred Qualifications, and Company Information.',
  },
  {
    id: 'sample-15',
    name: 'Presentation Script Intro',
    content:
      "Write an engaging introduction for a presentation about {presentation_topic}. Start with a hook, briefly introduce the topic, and state the presentation's main goal or key takeaways.",
  },
  {
    id: 'sample-16',
    name: 'Difficult Conversation Planner',
    content:
      'Help me plan a difficult conversation with {person} about {issue}. Outline key points to cover, potential responses, and desired outcomes. Suggest opening lines.',
  },
  {
    id: 'sample-17',
    name: 'Research Question Generator',
    content:
      'Generate 5 potential research questions related to the broad topic of {research_area}. Ensure the questions are specific, measurable, achievable, relevant, and time-bound (SMART) where applicable.',
  },
  {
    id: 'sample-18',
    name: 'Brainstorming Session Starter',
    content:
      'Provide 5 creative prompts or questions to kickstart a brainstorming session for {project_or_goal}. Focus on encouraging divergent thinking.',
  },
];

type Prompt = {
  id: string;
  name: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string | null;
  sharing: string;
  folder_id: string | null;
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [promptName, setPromptName] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [improvingPrompt, setImprovingPrompt] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrompt = async () => {
    if (!promptName.trim() || !promptContent.trim()) {
      toast.error('Name and content are required');
      return;
    }

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: promptName,
          content: promptContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add prompt');
      }

      toast.success('Prompt added successfully');
      setShowAddDialog(false);
      setPromptName('');
      setPromptContent('');
      fetchPrompts();
    } catch (error) {
      toast.error('Failed to add prompt');
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPromptId(prompt.id);
    setPromptName(prompt.name);
    setPromptContent(prompt.content);
    setShowEditDialog(true);
  };

  const saveEditedPrompt = async () => {
    if (!promptName.trim() || !promptContent.trim() || !selectedPromptId) {
      toast.error('Name and content are required');
      return;
    }

    try {
      const response = await fetch(`/api/prompts?id=${selectedPromptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: promptName,
          content: promptContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update prompt');
      }

      toast.success('Prompt updated successfully');
      setShowEditDialog(false);
      setPromptName('');
      setPromptContent('');
      setSelectedPromptId(null);
      fetchPrompts();
    } catch (error) {
      toast.error('Failed to update prompt');
    }
  };

  const confirmDeletePrompt = (id: string) => {
    setSelectedPromptId(id);
    setShowDeleteDialog(true);
  };

  const handleDeletePrompt = async () => {
    if (!selectedPromptId) return;

    try {
      const response = await fetch(`/api/prompts?id=${selectedPromptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete prompt');
      }

      toast.success('Prompt deleted successfully');
      setShowDeleteDialog(false);
      setSelectedPromptId(null);
      fetchPrompts();
    } catch (error) {
      toast.error('Failed to delete prompt');
    }
  };

  const resetForm = () => {
    setPromptName('');
    setPromptContent('');
    setSelectedPromptId(null);
  };

  const handleImprovePrompt = async () => {
    if (!promptContent.trim()) {
      toast.info('Please enter some content to improve.');
      return;
    }
    setImprovingPrompt(true);
    try {
      const response = await fetch('/api/prompts/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: promptName, content: promptContent }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to improve prompt');
      }
      const data = await response.json();
      setPromptName(data.improvedName);
      setPromptContent(data.improvedContent);
      toast.success('Prompt improved with AI!');
    } catch (error: any) {
      toast.error(`Improvement failed: ${error.message}`);
    } finally {
      setImprovingPrompt(false);
    }
  };

  // Renamed function and updated logic to pre-fill the Add dialog
  const handleUseSamplePrompt = (name: string, content: string) => {
    setPromptName(name); // Pre-fill name
    setPromptContent(content); // Pre-fill content
    setShowAddDialog(true); // Open the Add dialog
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex justify-between items-center h-12 px-4 md:px-6 border-b bg-background w-full shrink-0">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <SparklesIcon size={20} />
          Prompts
        </h1>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="gap-2"
          size="xs"
        >
          <PlusIcon size={14} />
          <span>New Prompt</span>
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-sm text-muted-foreground mb-6">
            Create prompts with template variables like {'{variable}'} and use
            them quickly by typing / in the chat.
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : prompts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  onClick={() => handleEditPrompt(prompt)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleEditPrompt(prompt);
                    }
                  }}
                  className="flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <div className="mb-2 p-2 rounded-full bg-primary/10 text-primary">
                    <SparklesIcon size={20} />
                  </div>
                  <h3 className="font-semibold mb-1">{prompt.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {prompt.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 text-muted-foreground">
                <SparklesIcon size={48} />
              </div>
              <h3 className="font-medium mb-2">No prompts yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first prompt to quickly reuse in chats.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                Create a Prompt
              </Button>
            </div>
          )}

          {/* Sample Prompts Gallery - Added Section */}
          <div className="mt-12 pt-6 border-t">
            {' '}
            {/* Added spacing and top border */}
            <h2 className="text-xl font-semibold mb-6">Prompts Gallery</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {samplePrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card/80 hover:shadow-md transition-shadow" // Slightly different bg
                >
                  <div className="mb-2 p-2 rounded-full bg-secondary/20 text-secondary-foreground">
                    {' '}
                    {/* Different icon style */}
                    <SparklesIcon size={20} />
                  </div>
                  <h3 className="font-semibold mb-1">{prompt.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-grow">
                    {' '}
                    {/* Added flex-grow */}
                    {prompt.content}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleUseSamplePrompt(prompt.name, prompt.content)
                    }
                    className="mt-auto w-full"
                  >
                    <PlusIcon size={14} /> Use
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Dialog
            open={showAddDialog}
            onOpenChange={(open) => {
              setShowAddDialog(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Prompt</DialogTitle>
                <DialogDescription>
                  Add a new prompt template. Use {'{variable}'} for template
                  variables.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Prompt Name</Label>
                  <Input
                    id="name"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    placeholder="Enter a name for your prompt"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <div className="relative">
                    <Textarea
                      id="content"
                      value={promptContent}
                      onChange={(e) => setPromptContent(e.target.value)}
                      placeholder="Enter your prompt content"
                      rows={5}
                      className="pr-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleImprovePrompt}
                      disabled={improvingPrompt}
                      className="absolute bottom-2 right-2 h-7 gap-1"
                    >
                      {improvingPrompt ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <WandSparklesIcon />
                      )}
                      Improve
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddPrompt}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showEditDialog}
            onOpenChange={(open) => {
              setShowEditDialog(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Prompt</DialogTitle>
                <DialogDescription>
                  Update your prompt template. Use {'{variable}'} for template
                  variables.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Prompt Name</Label>
                  <Input
                    id="edit-name"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-content">Content</Label>
                  <div className="relative">
                    <Textarea
                      id="edit-content"
                      value={promptContent}
                      onChange={(e) => setPromptContent(e.target.value)}
                      rows={5}
                      className="pr-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleImprovePrompt}
                      disabled={improvingPrompt}
                      className="absolute bottom-2 right-2 h-7 gap-1"
                    >
                      {improvingPrompt ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <WandSparklesIcon />
                      )}
                      Improve
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedPromptId) {
                      setShowEditDialog(false);
                      confirmDeletePrompt(selectedPromptId);
                    }
                  }}
                  className="ml-auto"
                >
                  <TrashIcon size={14} /> Delete
                </Button>
                <Button onClick={saveEditedPrompt}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  selected prompt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePrompt}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
