-- Add indexes on foreign key columns that are frequently queried but lack indexes.
-- These eliminate full table scans on JOIN and WHERE operations.

-- account.userId — used by auth lookups
CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);

-- session.userId — used by auth lookups
CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);

-- pages.userId — used by dashboard page list
CREATE INDEX IF NOT EXISTS idx_pages_userId ON pages(userId);

-- generatedPages.pageId — used by page render
CREATE INDEX IF NOT EXISTS idx_generatedPages_pageId ON generatedPages(pageId);

-- links.pageId — used by page render + analytics
CREATE INDEX IF NOT EXISTS idx_links_pageId ON links(pageId);

-- projects.pageId — used by page render
CREATE INDEX IF NOT EXISTS idx_projects_pageId ON projects(pageId);

-- infoBlocks.pageId — used by page render
CREATE INDEX IF NOT EXISTS idx_infoBlocks_pageId ON infoBlocks(pageId);

-- pageSections.pageId — used by page render
CREATE INDEX IF NOT EXISTS idx_pageSections_pageId ON pageSections(pageId);

-- contactSubmissions.pageId — used by inbox
CREATE INDEX IF NOT EXISTS idx_contactSubmissions_pageId ON contactSubmissions(pageId);

-- pageEvents.pageId — used by analytics
CREATE INDEX IF NOT EXISTS idx_pageEvents_pageId ON pageEvents(pageId);

-- dailyStats.pageId — used by dashboard stats
CREATE INDEX IF NOT EXISTS idx_dailyStats_pageId ON dailyStats(pageId);

-- dailyResourceStats.pageId — used by dashboard stats
CREATE INDEX IF NOT EXISTS idx_dailyResourceStats_pageId ON dailyResourceStats(pageId);

-- dailyVisitorEvents.pageId — used by dashboard stats
CREATE INDEX IF NOT EXISTS idx_dailyVisitorEvents_pageId ON dailyVisitorEvents(pageId);

-- pageDomains.pageId — used by domain lookup
CREATE INDEX IF NOT EXISTS idx_pageDomains_pageId ON pageDomains(pageId);

-- conversations.pageId — used by chat
CREATE INDEX IF NOT EXISTS idx_conversations_pageId ON conversations(pageId);

-- messages.conversationId — used by chat message list
CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);

-- timelineEvents.pageId — used by timeline
CREATE INDEX IF NOT EXISTS idx_timelineEvents_pageId ON timelineEvents(pageId);

-- apiKeys.userId — used by API key lookup
CREATE INDEX IF NOT EXISTS idx_apiKeys_userId ON apiKeys(userId);

-- agentAuthCodes is keyed by email and has no userId column. Its email and
-- expiry indexes are created with the table in 006_agent_trust_cards.sql.
