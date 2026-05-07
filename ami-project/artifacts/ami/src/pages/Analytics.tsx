import { Link } from "wouter";
import {
  useGetLeadAnalyticsSummary,
  useListLeads,
  useListOpenaiConversations,
} from "@workspace/api-client-react";
import { MessageSquare, BarChart2, Languages, Settings, Sparkles, TrendingUp, Users, Flame, Thermometer, Snowflake, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function getStatusConfig(status: string) {
  if (status === "hot") return { label: "Hot", icon: Flame, className: "bg-rose-100 text-rose-700 border-rose-200" };
  if (status === "warm") return { label: "Warm", icon: Thermometer, className: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Cold", icon: Snowflake, className: "bg-sky-100 text-sky-700 border-sky-200" };
}

const LANG_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  hinglish: "Hinglish",
  mr: "Marathi",
};

export default function Analytics() {
  const { data: summary, isLoading: summaryLoading } = useGetLeadAnalyticsSummary();
  const { data: leads, isLoading: leadsLoading } = useListLeads();
  const { data: conversations } = useListOpenaiConversations();

  const statCards = [
    { label: "Total Leads", value: summary?.total ?? 0, icon: Users, color: "text-primary" },
    { label: "Hot Leads", value: summary?.hot ?? 0, icon: Flame, color: "text-rose-500" },
    { label: "Warm Leads", value: summary?.warm ?? 0, icon: Thermometer, color: "text-amber-500" },
    { label: "Avg Trust Score", value: `${Math.round(summary?.avgTrustScore ?? 0)}%`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden" data-testid="analytics">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
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
        <nav className="p-3 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            data-testid="nav-conversations"
          >
            <MessageSquare className="w-4 h-4" />
            Conversations
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground bg-sidebar-accent"
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
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-5 border-b border-border bg-card/50 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Lead Analytics</h1>
            <p className="text-xs text-muted-foreground">Overview of all partner conversations and lead quality</p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-8 space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4" data-testid="stats-grid">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-card border border-card-border rounded-2xl p-5 shadow-sm">
                    {summaryLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-muted-foreground">{card.label}</p>
                          <Icon className={cn("w-4 h-4", card.color)} />
                        </div>
                        <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Lead Status Distribution */}
              <div className="bg-card border border-card-border rounded-2xl p-5 col-span-1 shadow-sm" data-testid="status-distribution">
                <p className="font-semibold text-sm text-foreground mb-4">Lead Distribution</p>
                {summaryLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: "Hot", count: summary?.hot ?? 0, total: summary?.total ?? 1, color: "bg-rose-400" },
                      { label: "Warm", count: summary?.warm ?? 0, total: summary?.total ?? 1, color: "bg-amber-400" },
                      { label: "Cold", count: summary?.cold ?? 0, total: summary?.total ?? 1, color: "bg-sky-400" },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-xs font-semibold text-foreground">{item.count}</p>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", item.color)}
                            style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Language Distribution */}
              <div className="bg-card border border-card-border rounded-2xl p-5 col-span-1 shadow-sm" data-testid="language-distribution">
                <p className="font-semibold text-sm text-foreground mb-4">Language Preferences</p>
                {summaryLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(summary?.languageDistribution ?? {}).map(([lang, count]) => (
                      <div key={lang} className="flex items-center justify-between">
                        <p className="text-xs text-foreground">{LANG_LABELS[lang] ?? lang}</p>
                        <Badge variant="outline" className="text-xs">{count}</Badge>
                      </div>
                    ))}
                    {Object.keys(summary?.languageDistribution ?? {}).length === 0 && (
                      <p className="text-xs text-muted-foreground">No data yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Conversations Summary */}
              <div className="bg-card border border-card-border rounded-2xl p-5 col-span-1 shadow-sm">
                <p className="font-semibold text-sm text-foreground mb-4">Conversations</p>
                <p className="text-2xl font-bold text-primary mb-1">{conversations?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total conversations</p>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden" data-testid="leads-table">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-semibold text-sm text-foreground">All Leads</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Language</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Trust</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-5 py-3"><Skeleton className="h-5 w-16" /></td>
                          <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-5 py-3"><Skeleton className="h-4 w-10" /></td>
                          <td className="px-5 py-3"><Skeleton className="h-4 w-10" /></td>
                        </tr>
                      ))
                    ) : leads?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                          No leads yet. Start a conversation to generate leads.
                        </td>
                      </tr>
                    ) : (
                      leads?.map((lead) => {
                        const config = getStatusConfig(lead.status);
                        return (
                          <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors" data-testid={`lead-row-${lead.id}`}>
                            <td className="px-5 py-3 text-sm font-medium text-foreground">{lead.name}</td>
                            <td className="px-5 py-3">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", config.className)}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-muted-foreground">{LANG_LABELS[lead.language] ?? lead.language}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-foreground">{lead.trustScore}%</td>
                            <td className="px-5 py-3 text-xs font-semibold text-foreground">{lead.interestLevel}%</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
