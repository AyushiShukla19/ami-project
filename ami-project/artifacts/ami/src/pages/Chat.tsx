import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOpenaiConversations,
  getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useListOpenaiMessages,
  getListOpenaiMessagesQueryKey,
  useCreateLead,
  useListLeads,
  useUpdateLead,
  getListLeadsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Send, Loader2, Bot, User, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function Chat() {
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
  const creatingLeadForConv = useRef<number | null>(null);

  const { data: conversations, isLoading: conversationsLoading } = useListOpenaiConversations();
  const { data: fetchedMessages } = useListOpenaiMessages(activeConversationId!, {
    query: {
      enabled: !!activeConversationId,
      queryKey: getListOpenaiMessagesQueryKey(activeConversationId!),
    },
  });
  const { data: allLeads } = useListLeads();

  const createConversation = useCreateOpenaiConversation();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

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

  useEffect(() => {
    if (conversationsLoading || hasInitialized.current) return;
    hasInitialized.current = true;

    if (conversations && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    } else {
      createConversation.mutate(
        { data: { title: "New Conversation" } },
        {
          onSuccess: (conv) => {
            setActiveConversationId(conv.id);
            setLocalMessages([]);
            queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          },
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationsLoading, conversations]);

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
                  setLocalMessages((prev) => [
                    ...prev,
                    { id: Date.now() + 1, role: "assistant", content: fullResponse, createdAt: new Date() },
                  ]);
                  setStreamingMessage("");
                  queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(activeConversationId) });

                  if (activeLeadId && pendingLeadAnalysis) {
                    const analysis = pendingLeadAnalysis;
                    updateLead.mutate({
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
                    });
                  }
                }
              } catch {
                // ignore incomplete chunks
              }
            }
          }
        }
      } catch {
        setLocalMessages((prev) => [
          ...prev,
          { id: Date.now() + 2, role: "assistant", content: "I apologize — something went wrong. Please try again.", createdAt: new Date() },
        ]);
      } finally {
        setIsStreaming(false);
        setStreamingMessage("");
      }
    },
    [activeConversationId, activeLeadId, isStreaming, language, queryClient, updateLead]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="chat-page">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-rose-300 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-none">Ami</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your AI growth partner — Rupeezy AP Program</p>
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
      <ScrollArea className="flex-1 px-4 py-6 md:px-10">
        <div className="max-w-2xl mx-auto space-y-5">
          {localMessages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-rose-200/40 flex items-center justify-center mb-5">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to Rupeezy</h2>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                I am Ami, your guide to the Rupeezy Authorized Person program. Ask me anything about partnering with us.
              </p>
            </div>
          )}

          {localMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              data-testid={`message-${msg.role}`}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5",
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-primary to-rose-300 shadow-sm"
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
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                  msg.role === "assistant"
                    ? "bg-card border border-card-border text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-rose-300 flex-shrink-0 flex items-center justify-center mt-0.5 shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-card border border-card-border text-foreground shadow-sm">
                {streamingMessage || (
                  <span className="flex items-center gap-1.5 py-1">
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
      <div className="px-4 pb-3 md:px-10">
        <div className="max-w-2xl mx-auto flex gap-2 flex-wrap">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={isStreaming}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-40"
              data-testid={`quick-prompt-${prompt.slice(0, 10)}`}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-6 md:px-10">
        <div className="max-w-2xl mx-auto flex gap-2 items-end bg-card border border-border rounded-2xl shadow-sm p-3 mb-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the Rupeezy partner program..."
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
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="max-w-2xl mx-auto text-center pt-1 pb-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="w-3 h-3" />
            Team Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

