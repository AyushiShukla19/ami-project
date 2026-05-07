import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useListOpenaiConversations,
  getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
  useListOpenaiMessages,
  getListOpenaiMessagesQueryKey,
  useListLeads,
  useCreateLead,
  useGetLead,
  getGetLeadQueryKey,
  useUpdateLead,
  getListLeadsQueryKey,
} from "@workspace/api-client-react";
import { MessageSquare, BarChart2, Languages, Settings, Plus, Trash2, Send, Loader2, Bot, User, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Language = "en" | "hi" | "hinglish" | "mr";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिं" },
  { code: "hinglish", label: "HG" },
  { code: "mr", label: "मर" },
];

const QUICK_PROMPTS = [
  "Explain the partner program",
  "Earnings & brokerage",
  "Already with another broker?",
  "Is Rupeezy trustworthy?",
];

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string | Date;
}

function getStatusColor(status: string) {
  if (status === "hot") return "bg-rose-100 text-rose-700 border-rose-200";
  if (status === "warm") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-sky-100 text-sky-700 border-sky-200";
}

function getScoreColor(score: number) {
  if (score >= 70) return "bg-rose-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-sky-400";
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const { data: conversations, isLoading: conversationsLoading } = useListOpenaiConversations();
  const { data: fetchedMessages } = useListOpenaiMessages(activeConversationId!, {
    query: {
      enabled: !!activeConversationId,
      queryKey: getListOpenaiMessagesQueryKey(activeConversationId!),
    },
  });
  const { data: allLeads } = useListLeads();
  const { data: lead } = useGetLead(activeLeadId!, {
    query: {
      enabled: !!activeLeadId,
      queryKey: getGetLeadQueryKey(activeLeadId!),
    },
  });

  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  // When active conversation changes, look up its linked lead — create one if missing
  const creatingLeadForConv = useRef<number | null>(null);
  useEffect(() => {
    if (!activeConversationId || !allLeads) return;
    const linked = allLeads.find((l) => l.conversationId === activeConversationId);
    if (linked) {
      setActiveLeadId(linked.id);
    } else if (creatingLeadForConv.current !== activeConversationId) {
      creatingLeadForConv.current = activeConversationId;
      createLead.mutate(
        { data: { name: "New Lead", language } },
        {
          onSuccess: (newLead) => {
            setActiveLeadId(newLead.id);
            updateLead.mutate({ id: newLead.id, data: { conversationId: activeConversationId } });
            queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          },
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, allLeads]);

  useEffect(() => {
    if (fetchedMessages) {
      setLocalMessages(
        fetchedMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt,
        }))
      );
    }
  }, [fetchedMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, streamingMessage]);

  // One-time init: pick existing or create new conversation
  useEffect(() => {
    if (conversationsLoading || hasInitialized.current) return;
    hasInitialized.current = true;

    if (conversations && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    } else {
      createConversation.mutate(
        { data: { title: "Conversation 1" } },
        {
          onSuccess: (conv) => {
            setActiveConversationId(conv.id);
            setLocalMessages([]);
            queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
            createLead.mutate(
              { data: { name: "New Lead", language: "en" } },
              {
                onSuccess: (newLead) => {
                  setActiveLeadId(newLead.id);
                  updateLead.mutate({ id: newLead.id, data: { conversationId: conv.id } });
                  queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
                },
              }
            );
          },
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationsLoading, conversations]);

  const createNewConversation = useCallback(() => {
    createConversation.mutate(
      { data: { title: `Conversation ${(conversations?.length ?? 0) + 1}` } },
      {
        onSuccess: (conv) => {
          setActiveConversationId(conv.id);
          setLocalMessages([]);
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          createLead.mutate(
            { data: { name: "New Lead", language } },
            {
              onSuccess: (newLead) => {
                setActiveLeadId(newLead.id);
                updateLead.mutate({ id: newLead.id, data: { conversationId: conv.id } });
                queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
              },
            }
          );
        },
      }
    );
  }, [conversations, createConversation, createLead, language, queryClient, updateLead]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeConversationId || isStreaming) return;

      const userMsg: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: text,
        createdAt: new Date(),
      };
      setLocalMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setIsStreaming(true);
      setStreamingMessage("");

      try {
        const response = await fetch(`/api/openai/conversations/${activeConversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, language }),
        });

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResponse = "";
        let pendingLeadAnalysis: {
          status?: string;
          trustScore?: number;
          interestLevel?: number;
          emotionalEngagement?: number;
          objectionsRaised?: string;
          recommendation?: string;
        } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop()!;
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  setStreamingMessage(fullResponse);
                }
                if (data.leadAnalysis) {
                  pendingLeadAnalysis = data.leadAnalysis;
                }
                if (data.done) {
                  const amiMsg: ChatMessage = {
                    id: Date.now() + 1,
                    role: "assistant",
                    content: fullResponse,
                    createdAt: new Date(),
                  };
                  setLocalMessages((prev) => [...prev, amiMsg]);
                  setStreamingMessage("");
                  queryClient.invalidateQueries({
                    queryKey: getListOpenaiMessagesQueryKey(activeConversationId),
                  });

                  if (activeLeadId && pendingLeadAnalysis) {
                    const analysis = pendingLeadAnalysis;
                    updateLead.mutate(
                      {
                        id: activeLeadId,
                        data: {
                          status: analysis.status ?? "cold",
                          trustScore: analysis.trustScore ?? 0,
                          interestLevel: analysis.interestLevel ?? 0,
                          emotionalEngagement: analysis.emotionalEngagement ?? 0,
                          objectionsRaised: analysis.objectionsRaised ?? null,
                          recommendation: analysis.recommendation ?? null,
                          language,
                        },
                      },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({
                            queryKey: getGetLeadQueryKey(activeLeadId),
                          });
                        },
                      }
                    );
                  }
                }
              } catch {
                // ignore JSON parse errors on incomplete chunks
              }
            }
          }
        }
      } catch {
        setLocalMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            role: "assistant",
            content: "I apologize — something went wrong. Please try again.",
            createdAt: new Date(),
          },
        ]);
      } finally {
        setIsStreaming(false);
        setStreamingMessage("");
      }
    },
    [activeConversationId, activeLeadId, isStreaming, language, lead, queryClient, updateLead]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const handleDeleteConversation = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          if (activeConversationId === id) {
            setActiveConversationId(null);
            setLocalMessages([]);
          }
        },
      }
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden" data-testid="dashboard">
      {/* LEFT PANEL — Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Brand */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-sidebar-foreground leading-none">Ami</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">by Rupeezy</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1 border-b border-sidebar-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground bg-sidebar-accent"
            data-testid="nav-conversations"
          >
            <MessageSquare className="w-4 h-4" />
            Conversations
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            data-testid="nav-analytics"
          >
            <BarChart2 className="w-4 h-4" />
            Analytics
          </Link>
          <span className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground cursor-pointer" data-testid="nav-languages">
            <Languages className="w-4 h-4" />
            Languages
          </span>
          <span className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground cursor-pointer" data-testid="nav-settings">
            <Settings className="w-4 h-4" />
            Settings
          </span>
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            data-testid="nav-partner-view"
          >
            <ExternalLink className="w-4 h-4" />
            Partner View
          </Link>
        </nav>

        {/* Conversations List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chats</p>
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6"
              onClick={createNewConversation}
              data-testid="button-new-conversation"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 px-2">
            {conversations?.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors mb-1",
                  activeConversationId === conv.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  setLocalMessages([]);
                }}
                data-testid={`conversation-item-${conv.id}`}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 truncate">{conv.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  data-testid={`button-delete-conversation-${conv.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </ScrollArea>
        </div>
      </aside>

      {/* CENTER PANEL — Chat */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-rose-300 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Ami</p>
              <p className="text-xs text-muted-foreground">Your AI Growth Partner</p>
            </div>
          </div>
          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 bg-muted/60 rounded-full p-1" data-testid="language-switcher">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  language === code
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`button-language-${code}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6 py-4">
          {localMessages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-rose-200/40 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Welcome — I am Ami</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Your AI growth partner for Rupeezy's Authorized Person program. Ask me anything about the partnership opportunity.
              </p>
            </div>
          )}
          <div className="space-y-4 max-w-3xl mx-auto">
            {localMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                data-testid={`message-${msg.role}-${msg.id}`}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center",
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-primary to-rose-300"
                      : "bg-muted border border-border"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-accent text-foreground rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-rose-300 flex-shrink-0 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed bg-accent text-foreground">
                  {streamingMessage || (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Prompts */}
        <div className="px-6 pb-2 flex gap-2 flex-wrap max-w-3xl mx-auto w-full">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
              data-testid={`quick-prompt-${prompt.slice(0, 10)}`}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="px-6 pb-5 pt-2">
          <div className="max-w-3xl mx-auto flex gap-2 items-end bg-card border border-border rounded-2xl shadow-sm p-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Ami anything about the Rupeezy partner program..."
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[36px] max-h-[120px] leading-relaxed"
              rows={1}
              data-testid="input-message"
              disabled={isStreaming || !activeConversationId}
            />
            <Button
              size="icon"
              className="flex-shrink-0 w-8 h-8 rounded-xl"
              onClick={() => sendMessage(inputText)}
              disabled={isStreaming || !inputText.trim() || !activeConversationId}
              data-testid="button-send"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* RIGHT PANEL — Relationship Pulse */}
      <aside className="w-72 flex-shrink-0 border-l border-border bg-card/50 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-border">
          <p className="font-semibold text-sm text-foreground">Relationship Pulse</p>
          <p className="text-xs text-muted-foreground mt-0.5">Live lead insights</p>
        </div>

        {lead ? (
          <div className="p-4 space-y-4">
            {/* Lead Status */}
            <div data-testid="lead-status">
              <p className="text-xs text-muted-foreground mb-1.5">Lead Status</p>
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize",
                  getStatusColor(lead.status)
                )}
              >
                {lead.status === "hot" ? "Hot Lead" : lead.status === "warm" ? "Warm Lead" : "Cold Lead"}
              </span>
            </div>

            {/* Trust Meter */}
            <div data-testid="trust-meter">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-muted-foreground">Trust Meter</p>
                <p className="text-xs font-semibold text-foreground">{lead.trustScore}%</p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", getScoreColor(lead.trustScore))}
                  style={{ width: `${lead.trustScore}%` }}
                />
              </div>
            </div>

            {/* Interest Level */}
            <div data-testid="interest-level">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-muted-foreground">Interest Level</p>
                <p className="text-xs font-semibold text-foreground">{lead.interestLevel}%</p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", getScoreColor(lead.interestLevel))}
                  style={{ width: `${lead.interestLevel}%` }}
                />
              </div>
            </div>

            {/* Emotional Engagement */}
            <div data-testid="emotional-engagement">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-muted-foreground">Emotional Engagement</p>
                <p className="text-xs font-semibold text-foreground">{lead.emotionalEngagement}%</p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", getScoreColor(lead.emotionalEngagement))}
                  style={{ width: `${lead.emotionalEngagement}%` }}
                />
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2.5">
              {/* Language */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Preferred Language</p>
                <Badge variant="outline" className="text-xs">
                  {lead.language === "en" ? "English" : lead.language === "hi" ? "Hindi" : lead.language === "hinglish" ? "Hinglish" : "Marathi"}
                </Badge>
              </div>

              {/* Objections */}
              {lead.objectionsRaised && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Objections Raised</p>
                  <p className="text-xs text-foreground bg-muted/60 px-2.5 py-1.5 rounded-lg">{lead.objectionsRaised}</p>
                </div>
              )}

              {/* Recommendation */}
              {lead.recommendation && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
                  <p className="text-xs text-foreground bg-accent/60 px-2.5 py-1.5 rounded-lg">{lead.recommendation}</p>
                </div>
              )}
            </div>

            {/* RM Handoff Button */}
            {(lead.status === "hot" || lead.status === "warm") && (
              <div className="pt-2">
                <Button
                  className="w-full text-sm bg-gradient-to-r from-rose-500 to-primary hover:from-rose-600 hover:to-primary/90 shadow-md"
                  data-testid="button-connect-rm"
                >
                  Connect to RM
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                  {lead.status === "hot" ? "This lead is ready for a human handoff" : "This lead is warming up — connect when ready"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <BarChart2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No lead data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a conversation to see insights</p>
          </div>
        )}
      </aside>
    </div>
  );
}

