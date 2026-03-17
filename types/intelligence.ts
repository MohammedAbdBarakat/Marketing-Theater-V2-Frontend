export type IntelligenceItem = {
  title: string;
  description: string;
  source: string;
};

export type IntelligenceSignal = {
  type: string;
  name: string;
  description: string;
  implication: string;
  importance: string;
  source: string;
};

export type DayCapsule = {
  day_index: number;
  date: string;
  signals: IntelligenceSignal[];
};

export type GlobalIntelligence = {
  competitor_landscape: IntelligenceItem[];
  trending_topics: IntelligenceItem[];
  audience_sentiment: IntelligenceItem[];
  industry_news: IntelligenceItem[];
  strategic_opportunities: string[];
};

export type IntelligenceReport = {
  global_intelligence: GlobalIntelligence;
  day_capsules: DayCapsule[];
};

export type ConfirmSignalsPayload = {
  intelligence_report: IntelligenceReport;
};
