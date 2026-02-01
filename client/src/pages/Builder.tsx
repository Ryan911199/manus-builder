import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLLMSettings, LLMProvider } from "@/hooks/useLLMSettings";
import { getLoginUrl } from "@/const";
import {
  Send,
  Play,
  Rocket,
  FolderOpen,
  Save,
  Plus,
  Settings,
  FileCode,
  File,
  Folder,
  ChevronRight,
  ChevronDown,
  Loader2,
  MessageSquare,
  Code,
  Eye,
  History,
  Trash2,
} from "lucide-react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { nightOwl } from "@codesandbox/sandpack-themes";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

// Framework templates
const frameworkTemplates: Record<string, Record<string, string>> = {
  react: {
    "/App.jsx": `export default function App() {
  return (
    <div className="app">
      <h1>Hello React!</h1>
      <p>Start editing to see changes.</p>
    </div>
  );
}`,
    "/index.html": `<!DOCTYPE html>
<html>
<head>
  <title>React App</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
    "/styles.css": `.app {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  text-align: center;
}

h1 {
  color: #61dafb;
}`,
  },
  vue: {
    "/App.vue": `<template>
  <div class="app">
    <h1>Hello Vue!</h1>
    <p>Start editing to see changes.</p>
  </div>
</template>

<script setup>
</script>

<style scoped>
.app {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  text-align: center;
}

h1 {
  color: #42b883;
}
</style>`,
  },
  vanilla: {
    "/index.html": `<!DOCTYPE html>
<html>
<head>
  <title>Vanilla JS App</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <div id="app">
    <h1>Hello World!</h1>
    <p>Start editing to see changes.</p>
  </div>
  <script src="/index.js"></script>
</body>
</html>`,
    "/index.js": `document.querySelector('h1').addEventListener('click', () => {
  alert('Hello from JavaScript!');
});`,
    "/styles.css": `#app {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  text-align: center;
}

h1 {
  color: #f7df1e;
  cursor: pointer;
}`,
  },
};

// File tree component
interface FileTreeProps {
  files: Record<string, string>;
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["/"])
  );

  const fileStructure = useMemo(() => {
    const structure: Record<
      string,
      { type: "file" | "folder"; children?: string[] }
    > = {};
    const paths = Object.keys(files).sort();

    paths.forEach(path => {
      const parts = path.split("/").filter(Boolean);
      let currentPath = "";

      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath + "/" + part;

        if (index === parts.length - 1) {
          structure[currentPath] = { type: "file" };
        } else {
          if (!structure[currentPath]) {
            structure[currentPath] = { type: "folder", children: [] };
          }
        }

        if (parentPath && structure[parentPath]?.children) {
          if (!structure[parentPath].children!.includes(currentPath)) {
            structure[parentPath].children!.push(currentPath);
          }
        }
      });
    });

    return structure;
  }, [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (path: string) => {
    if (path.endsWith(".jsx") || path.endsWith(".tsx"))
      return <FileCode className="h-4 w-4 text-blue-400" />;
    if (path.endsWith(".vue"))
      return <FileCode className="h-4 w-4 text-green-400" />;
    if (path.endsWith(".css"))
      return <FileCode className="h-4 w-4 text-pink-400" />;
    if (path.endsWith(".html"))
      return <FileCode className="h-4 w-4 text-orange-400" />;
    if (path.endsWith(".json"))
      return <FileCode className="h-4 w-4 text-yellow-400" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const renderItem = (path: string, depth: number = 0) => {
    const item = fileStructure[path];
    if (!item) return null;

    const name = path.split("/").pop() || path;
    const isExpanded = expandedFolders.has(path);
    const isSelected = selectedFile === path;

    if (item.type === "folder") {
      return (
        <div key={path}>
          <button
            className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-accent rounded text-left"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(path)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Folder className="h-4 w-4 text-yellow-500" />
            <span>{name}</span>
          </button>
          {isExpanded &&
            item.children?.map(child => renderItem(child, depth + 1))}
        </div>
      );
    }

    return (
      <button
        key={path}
        className={`flex items-center gap-2 w-full px-2 py-1 text-sm hover:bg-accent rounded text-left ${
          isSelected ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
        onClick={() => onSelectFile(path)}
      >
        {getFileIcon(path)}
        <span>{name}</span>
      </button>
    );
  };

  const rootFiles = Object.keys(files)
    .filter(path => path.split("/").filter(Boolean).length === 1)
    .sort();

  return (
    <div className="py-2">{rootFiles.map(path => renderItem(path, 0))}</div>
  );
}

// Chat message component
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Main Builder component
export default function Builder() {
  const { user, loading: authLoading } = useAuth();
  const [framework, setFramework] = useState<string>("react");
  const [files, setFiles] = useState<Record<string, string>>(
    frameworkTemplates.react
  );
  const [selectedFile, setSelectedFile] = useState<string>("/App.jsx");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showProjectsDialog, setShowProjectsDialog] = useState(false);

  // Workflow orchestration state
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // tRPC queries and mutations
  const projectsQuery = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });
  const generateMutation = trpc.ai.generate.useMutation();
  const orchestrateMutation = trpc.ai.orchestrate.useMutation();
  const createProjectMutation = trpc.projects.create.useMutation();
  const updateProjectMutation = trpc.projects.update.useMutation();
  const deleteProjectMutation = trpc.projects.delete.useMutation();
  const settingsQuery = trpc.deploy.getSettings.useQuery(undefined, {
    enabled: !!user,
  });
  const saveSettingsMutation = trpc.deploy.saveSettings.useMutation();
  const testConnectionMutation = trpc.deploy.testConnection.useMutation();
  const deployMutation = trpc.deploy.deployProject.useMutation();
  const trpcContext = trpc.useContext();

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    coolifyApiUrl: "",
    coolifyApiToken: "",
    coolifyProjectUuid: "",
    coolifyServerUuid: "",
  });

  // LLM settings
  const {
    settings: llmSettings,
    updateSettings: updateLLMSettings,
    getModelsForProvider,
    providers: llmProviders,
  } = useLLMSettings();

  // Poll workflow status when orchestrating
  useEffect(() => {
    if (!workflowId || !isOrchestrating) return;

    const pollStatus = async () => {
      try {
        const status = await trpcContext.ai.workflowStatus.fetch({
          workflowId,
        });
        setCurrentAgent(status.currentAgent ?? null);

        if (status.status === "completed") {
          setIsOrchestrating(false);
          setCurrentAgent(null);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          if (status.files) {
            setFiles(status.files);
            const firstFile = Object.keys(status.files)[0];
            if (firstFile) setSelectedFile(firstFile);

            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: status.explanation || "Code generated successfully!",
              timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, assistantMessage]);
            toast.success("Code generated successfully!");
          }
        } else if (status.status === "failed") {
          setIsOrchestrating(false);
          setCurrentAgent(null);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          toast.error(status.error || "Workflow failed");
        }
      } catch {
        console.error("Failed to poll workflow status");
      }
    };

    pollingRef.current = setInterval(pollStatus, 2000);
    pollStatus();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [workflowId, isOrchestrating, trpcContext.ai.workflowStatus]);

  // Handle framework change
  const handleFrameworkChange = (newFramework: string) => {
    setFramework(newFramework);
    setFiles(frameworkTemplates[newFramework] || frameworkTemplates.react);
    setSelectedFile(
      Object.keys(
        frameworkTemplates[newFramework] || frameworkTemplates.react
      )[0]
    );
  };

  // Handle file content change
  const handleFileChange = useCallback(
    (content: string) => {
      setFiles(prev => ({
        ...prev,
        [selectedFile]: content,
      }));
    },
    [selectedFile]
  );

  // Handle chat submit
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || generateMutation.isPending || isOrchestrating)
      return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const inputText = chatInput;
    setChatInput("");

    try {
      const result = await orchestrateMutation.mutateAsync({
        task: inputText,
        framework,
      });

      if (result.usedOrchestrator && result.workflowId) {
        setWorkflowId(result.workflowId);
        setIsOrchestrating(true);
        setCurrentAgent("planner");
      } else if (result.files) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.explanation || "Code generated successfully!",
          timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, assistantMessage]);
        setFiles(result.files);

        const firstFile = Object.keys(result.files)[0];
        if (firstFile) {
          setSelectedFile(firstFile);
        }

        toast.success("Code generated successfully!");
      }
    } catch {
      toast.error("Failed to generate code");
      setIsOrchestrating(false);
      setCurrentAgent(null);
    }
  };

  // Handle save project
  const handleSaveProject = async () => {
    if (!user) {
      toast.error("Please log in to save projects");
      return;
    }

    try {
      if (currentProjectId) {
        await updateProjectMutation.mutateAsync({
          id: currentProjectId,
          name: projectName,
          files,
        });
        toast.success("Project updated!");
      } else {
        const project = await createProjectMutation.mutateAsync({
          name: projectName,
          framework,
          files,
        });
        setCurrentProjectId(project.id);
        toast.success("Project saved!");
      }
      setShowSaveDialog(false);
      projectsQuery.refetch();
    } catch (error) {
      toast.error("Failed to save project");
      console.error(error);
    }
  };

  // Handle load project
  const handleLoadProject = (project: {
    id: number;
    name: string;
    framework: string;
    files: Record<string, string>;
  }) => {
    setCurrentProjectId(project.id);
    setProjectName(project.name);
    setFramework(project.framework);
    setFiles(project.files);
    setSelectedFile(Object.keys(project.files)[0] || "/App.jsx");
    setShowProjectsDialog(false);
    toast.success(`Loaded "${project.name}"`);
  };

  // Handle delete project
  const handleDeleteProject = async (id: number) => {
    try {
      await deleteProjectMutation.mutateAsync({ id });
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setProjectName("Untitled Project");
        setFiles(frameworkTemplates[framework]);
      }
      projectsQuery.refetch();
      toast.success("Project deleted");
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      await saveSettingsMutation.mutateAsync(settingsForm);
      toast.success("Settings saved!");
      setShowSettingsDialog(false);
      settingsQuery.refetch();
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  // Handle test connection
  const handleTestConnection = async () => {
    try {
      const result = await testConnectionMutation.mutateAsync();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Connection test failed");
    }
  };

  // Handle deploy
  const handleDeploy = async () => {
    if (!currentProjectId) {
      toast.error("Please save your project first");
      return;
    }

    if (!settingsQuery.data?.hasToken) {
      toast.error("Please configure Coolify settings first");
      setShowSettingsDialog(true);
      return;
    }

    try {
      await deployMutation.mutateAsync({ projectId: currentProjectId });
      toast.success("Deployment started!");
    } catch (error) {
      toast.error("Deployment failed");
      console.error(error);
    }
  };

  // Get language extension for CodeMirror
  const getLanguageExtension = (path: string) => {
    if (
      path.endsWith(".jsx") ||
      path.endsWith(".tsx") ||
      path.endsWith(".js") ||
      path.endsWith(".ts")
    ) {
      return [
        javascript({
          jsx: true,
          typescript: path.endsWith(".tsx") || path.endsWith(".ts"),
        }),
      ];
    }
    if (path.endsWith(".html") || path.endsWith(".vue")) return [html()];
    if (path.endsWith(".css")) return [css()];
    if (path.endsWith(".json")) return [json()];
    return [javascript()];
  };

  // Sandpack template mapping
  const getSandpackTemplate = () => {
    if (framework === "vue") return "vue";
    if (framework === "vanilla") return "vanilla";
    return "react";
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold">Manus Builder</h1>
        <p className="text-muted-foreground">Please log in to start building</p>
        <Button asChild>
          <a href={getLoginUrl()}>Log In</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Manus Builder</h1>
          <span className="text-sm text-muted-foreground">{projectName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={framework} onValueChange={handleFrameworkChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="vue">Vue</SelectItem>
              <SelectItem value="vanilla">Vanilla JS</SelectItem>
            </SelectContent>
          </Select>

          <Dialog
            open={showProjectsDialog}
            onOpenChange={setShowProjectsDialog}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Projects
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Your Projects</DialogTitle>
                <DialogDescription>
                  Load or manage your saved projects
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-80">
                {projectsQuery.data?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No projects yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {projectsQuery.data?.map(project => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                      >
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.framework} • Updated{" "}
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleLoadProject(project)}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Project</DialogTitle>
                <DialogDescription>Give your project a name</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                  />
                </div>
                <Button onClick={handleSaveProject} className="w-full">
                  {currentProjectId ? "Update Project" : "Save Project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showSettingsDialog}
            onOpenChange={setShowSettingsDialog}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Configure LLM and deployment settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">LLM Provider</h3>
                  <div>
                    <Label htmlFor="llmProvider">Provider</Label>
                    <Select
                      value={llmSettings.provider}
                      onValueChange={(value: LLMProvider) =>
                        updateLLMSettings({ provider: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {llmProviders.map(provider => (
                          <SelectItem key={provider} value={provider}>
                            {provider.charAt(0).toUpperCase() +
                              provider.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="llmApiKey">API Key</Label>
                    <Input
                      id="llmApiKey"
                      type="password"
                      value={llmSettings.apiKey}
                      onChange={e =>
                        updateLLMSettings({ apiKey: e.target.value })
                      }
                      placeholder={
                        llmSettings.provider === "ollama"
                          ? "Not required for Ollama"
                          : "Enter your API key"
                      }
                      disabled={llmSettings.provider === "ollama"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="llmModel">Model</Label>
                    <Select
                      value={llmSettings.model}
                      onValueChange={value =>
                        updateLLMSettings({ model: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getModelsForProvider(llmSettings.provider).map(
                          model => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-medium">Coolify Deployment</h3>
                  <div>
                    <Label htmlFor="coolifyApiUrl">Coolify API URL</Label>
                    <Input
                      id="coolifyApiUrl"
                      value={settingsForm.coolifyApiUrl}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          coolifyApiUrl: e.target.value,
                        }))
                      }
                      placeholder="https://coolify.example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coolifyApiToken">API Token</Label>
                    <Input
                      id="coolifyApiToken"
                      type="password"
                      value={settingsForm.coolifyApiToken}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          coolifyApiToken: e.target.value,
                        }))
                      }
                      placeholder="Your Coolify API token"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coolifyProjectUuid">Project UUID</Label>
                    <Input
                      id="coolifyProjectUuid"
                      value={settingsForm.coolifyProjectUuid}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          coolifyProjectUuid: e.target.value,
                        }))
                      }
                      placeholder="Project UUID from Coolify"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coolifyServerUuid">Server UUID</Label>
                    <Input
                      id="coolifyServerUuid"
                      value={settingsForm.coolifyServerUuid}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          coolifyServerUuid: e.target.value,
                        }))
                      }
                      placeholder="Server UUID from Coolify"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      className="flex-1"
                    >
                      Test Connection
                    </Button>
                    <Button onClick={handleSaveSettings} className="flex-1">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleDeploy} disabled={deployMutation.isPending}>
            {deployMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Deploy
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Chat Panel */}
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full flex flex-col border-r border-border">
              <div className="p-3 border-b border-border flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">AI Assistant</span>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Start a conversation to generate code</p>
                      <p className="text-sm mt-2">
                        Try: "Create a todo list app"
                      </p>
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground ml-4"
                            : "bg-muted mr-4"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ))
                  )}
                  {(generateMutation.isPending ||
                    orchestrateMutation.isPending ||
                    isOrchestrating) && (
                    <div className="flex items-center gap-2 text-muted-foreground p-3 rounded-lg bg-muted/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {currentAgent
                          ? `Agent: ${currentAgent.charAt(0).toUpperCase() + currentAgent.slice(1)}...`
                          : "Starting workflow..."}
                      </span>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Describe what you want to build..."
                    className="min-h-[80px] resize-none"
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                  />
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={handleChatSubmit}
                  disabled={
                    !chatInput.trim() ||
                    generateMutation.isPending ||
                    orchestrateMutation.isPending ||
                    isOrchestrating
                  }
                >
                  {isOrchestrating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isOrchestrating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Code Editor Panel */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full flex flex-col">
              <Tabs defaultValue="editor" className="h-full flex flex-col">
                <div className="border-b border-border px-2">
                  <TabsList className="h-10">
                    <TabsTrigger value="editor" className="gap-2">
                      <Code className="h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="files" className="gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Files
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="editor"
                  className="flex-1 m-0 overflow-hidden"
                >
                  <div className="h-full flex">
                    {/* File tree sidebar */}
                    <div className="w-48 border-r border-border overflow-auto">
                      <FileTree
                        files={files}
                        selectedFile={selectedFile}
                        onSelectFile={setSelectedFile}
                      />
                    </div>
                    {/* Code editor */}
                    <div className="flex-1 overflow-hidden">
                      <CodeMirror
                        value={files[selectedFile] || ""}
                        height="100%"
                        theme={vscodeDark}
                        extensions={getLanguageExtension(selectedFile)}
                        onChange={handleFileChange}
                        className="h-full"
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value="files"
                  className="flex-1 m-0 p-4 overflow-auto"
                >
                  <div className="space-y-2">
                    {Object.entries(files).map(([path, content]) => (
                      <div key={path} className="p-3 rounded-lg border">
                        <p className="font-mono text-sm font-medium">{path}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {content.split("\n").length} lines
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full flex flex-col">
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Live Preview</span>
              </div>
              <div className="flex-1 overflow-hidden bg-white">
                <SandpackProvider
                  template={getSandpackTemplate()}
                  files={files}
                  theme={nightOwl}
                  options={{
                    externalResources: ["https://cdn.tailwindcss.com"],
                  }}
                >
                  <SandpackPreview
                    showNavigator
                    showRefreshButton
                    style={{ height: "100%" }}
                  />
                </SandpackProvider>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
